#!/usr/bin/env node --experimental-strip-types

/**
 * Generate a proto plugin JSON from a GitHub release URL
 * Usage:
 *   Interactive: node --experimental-strip-types scripts/generate-proto-plugin.ts <github-url>
 *   Automated:   node --experimental-strip-types scripts/generate-proto-plugin.ts --auto <github-url>
 *   Custom file: node --experimental-strip-types scripts/generate-proto-plugin.ts --auto --output custom.json <github-url>
 */

import { writeFileSync } from "fs";
import readline from "readline";

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  content_type: string;
  size: number;
  download_count: number;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  assets: GitHubAsset[];
  body: string;
}

interface GitHubRepository {
  name: string;
  description: string;
  html_url: string;
  homepage: string;
}

interface ParsedGitHubUrl {
  owner: string;
  repo: string;
}

interface PlatformAssets {
  linux: GitHubAsset[];
  macos: GitHubAsset[];
  windows: GitHubAsset[];
}

interface AnalyzedAssets {
  platforms: PlatformAssets;
  architectures: string[];
}

interface PlatformConfig {
  "download-file": string;
  "archive-prefix": string;
  "bin-path": string;
  "checksum-file"?: string;
}

interface ProtoPlugin {
  name: string;
  type: string;
  description: string;
  platform: Record<string, PlatformConfig>;
  install: {
    "download-url": string;
    arch?: Record<string, string>;
  };
  resolve: {
    "git-url": string;
  };
}

interface GenerationOptions {
  interactive: boolean;
  autoSave: boolean;
  outputFile?: string;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function parseGitHubUrl(url: string): ParsedGitHubUrl {
  // Handle various GitHub URL formats
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/]+)(?:\/releases)?/,
    /github\.com\/([^\/]+)\/([^\/]+)\.git/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ""),
      };
    }
  }

  throw new Error("Invalid GitHub URL format");
}

async function fetchGitHubRelease(
  owner: string,
  repo: string,
): Promise<GitHubRelease> {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`,
      );
    }

    const release = (await response.json()) as GitHubRelease;
    return release;
  } catch (error) {
    throw new Error(
      `Failed to fetch release data: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function fetchGitHubRepo(
  owner: string,
  repo: string,
): Promise<GitHubRepository> {
  const url = `https://api.github.com/repos/${owner}/${repo}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`,
      );
    }

    const repoData = (await response.json()) as GitHubRepository;
    return repoData;
  } catch (error) {
    throw new Error(
      `Failed to fetch repository data: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function analyzeAssets(assets: GitHubAsset[]): AnalyzedAssets {
  const platforms: PlatformAssets = {
    linux: [],
    macos: [],
    windows: [],
  };

  const architectures = new Set<string>();

  for (const asset of assets) {
    const name = asset.name.toLowerCase();

    // Skip MSI files for automated mode, prefer tar.gz
    if (name.endsWith(".msi")) continue;

    // Detect platform
    let platform: keyof PlatformAssets | null = null;
    if (name.includes("linux") || name.includes("unknown-linux")) {
      platform = "linux";
    } else if (
      name.includes("darwin") ||
      name.includes("macos") ||
      name.includes("apple")
    ) {
      platform = "macos";
    } else if (
      name.includes("windows") ||
      name.includes("win") ||
      name.includes("msvc")
    ) {
      platform = "windows";
    }

    if (platform) {
      platforms[platform].push(asset);

      // Detect architecture
      if (name.includes("aarch64") || name.includes("arm64")) {
        architectures.add("aarch64");
      } else if (
        name.includes("x86_64") ||
        name.includes("amd64") ||
        name.includes("x64")
      ) {
        architectures.add("x86_64");
      }
    }
  }

  return { platforms, architectures: Array.from(architectures) };
}

function detectFilePattern(
  assets: GitHubAsset[],
  platform: string,
): string | null {
  if (assets.length === 0) return null;

  // Use the first asset as a template
  let pattern = assets[0].name;

  // Replace version patterns
  const versionPatterns = [/v(\d+\.\d+\.\d+[^\s-]*)/, /(\d+\.\d+\.\d+[^\s-]*)/];

  for (const versionPattern of versionPatterns) {
    const match = pattern.match(versionPattern);
    if (match) {
      pattern = pattern.replace(match[0], "v{version}");
      break;
    }
  }

  // Replace architecture patterns
  const archPatterns = ["amd64", "arm64", "x86_64", "aarch64", "x64"];

  for (const arch of archPatterns) {
    if (pattern.includes(arch)) {
      pattern = pattern.replace(arch, "{arch}");
      break;
    }
  }

  return pattern;
}

function generateArchivePrefix(downloadFile: string, platform: string): string {
  // Remove file extension and platform/arch specifics for a cleaner prefix
  let prefix = downloadFile.replace(/\.(tar\.gz|zip|tgz)$/, "");

  // Remove platform and arch patterns to get a generic prefix
  prefix = prefix.replace(/-{arch}$/, "");
  prefix = prefix.replace(/-linux$/, "");
  prefix = prefix.replace(/-macos$/, "");
  prefix = prefix.replace(/-windows$/, "");

  return prefix;
}

async function generateProtoPlugin(
  githubUrl: string,
  options: GenerationOptions,
): Promise<ProtoPlugin> {
  console.log("🔍 Analyzing GitHub repository...\n");

  const { owner, repo } = parseGitHubUrl(githubUrl);
  console.log(`Repository: ${owner}/${repo}`);

  const [release, repoData] = await Promise.all([
    fetchGitHubRelease(owner, repo),
    fetchGitHubRepo(owner, repo),
  ]);

  console.log(`Latest release: ${release.tag_name}`);
  console.log(`Assets found: ${release.assets.length}`);
  console.log(`Repository description: ${repoData.description}\n`);

  const { platforms, architectures } = analyzeAssets(release.assets);

  // Configuration (interactive or automated)
  let toolName: string;
  let description: string;
  let toolType: string;

  if (options.interactive) {
    toolName = (await prompt(`Tool name [${repo}]: `)) || repo;
    description =
      (await prompt(
        `Description [${repoData.description || release.name || repo}]: `,
      )) ||
      repoData.description ||
      release.name ||
      repo;
    toolType = (await prompt("Tool type [cli]: ")) || "cli";
  } else {
    toolName = repo;
    description = repoData.description || release.name || repo;
    toolType = "cli";
  }

  console.log("\n📦 Detected platforms and assets:");
  for (const [platform, assets] of Object.entries(platforms)) {
    if (assets.length > 0) {
      console.log(`  ${platform}: ${assets.length} assets`);
      assets.forEach((asset) => console.log(`    - ${asset.name}`));
    }
  }

  console.log(`\n🏗️  Detected architectures: ${architectures.join(", ")}\n`);

  const plugin: ProtoPlugin = {
    name: toolName,
    type: toolType,
    description: description,
    platform: {},
    install: {
      "download-url": `https://github.com/${owner}/${repo}/releases/download/v{version}/{download_file}`,
    },
    resolve: {
      "git-url": `https://github.com/${owner}/${repo}`,
    },
  };

  // Add architecture mapping if needed
  if (architectures.length > 0) {
    plugin.install.arch = {};
    for (const arch of architectures) {
      if (arch === "aarch64") {
        const mapping = options.interactive
          ? (await prompt(`Architecture mapping for aarch64 [arm64]: `)) ||
            "arm64"
          : "arm64";
        plugin.install.arch.aarch64 = mapping;
      } else if (arch === "x86_64") {
        const mapping = options.interactive
          ? (await prompt(`Architecture mapping for x86_64 [amd64]: `)) ||
            "amd64"
          : "amd64";
        plugin.install.arch.x86_64 = mapping;
      }
    }
  }

  // Configure platforms
  for (const [platformName, assets] of Object.entries(platforms)) {
    if (assets.length === 0) continue;

    console.log(
      `${options.interactive ? "\n" : ""}⚙️  Configuring ${platformName}...`,
    );

    const pattern = detectFilePattern(assets, platformName);
    let downloadFile: string;
    let archivePrefix: string;
    let binPath: string;

    if (options.interactive) {
      downloadFile =
        (await prompt(`Download file pattern [${pattern}]: `)) || pattern || "";
      archivePrefix = generateArchivePrefix(downloadFile, platformName);
      const prefixPrompt =
        (await prompt(`Archive prefix [${archivePrefix}]: `)) || archivePrefix;
      archivePrefix = prefixPrompt;

      const defaultBinPath =
        platformName === "windows" ? `${toolName}.exe` : toolName;
      binPath =
        (await prompt(`Binary path [${defaultBinPath}]: `)) || defaultBinPath;
    } else {
      downloadFile =
        pattern || `${toolName}-v{version}-${platformName}-{arch}.tar.gz`;
      archivePrefix = generateArchivePrefix(downloadFile, platformName);
      const defaultBinPath =
        platformName === "windows" ? `${toolName}.exe` : toolName;
      binPath = `bin/${defaultBinPath}`;
    }

    plugin.platform[platformName] = {
      "download-file": downloadFile,
      "archive-prefix": archivePrefix,
      "bin-path": binPath,
    };

    // Ask about checksum files (interactive mode only)
    if (options.interactive) {
      const hasChecksum = assets.some(
        (a) => a.name.includes("sha256") || a.name.includes("checksum"),
      );
      if (hasChecksum) {
        const useChecksum = await prompt("Include checksum file? (y/n) [n]: ");
        if (useChecksum.toLowerCase() === "y") {
          const checksumPattern = downloadFile + ".sha256";
          const checksumFile =
            (await prompt(`Checksum file pattern [${checksumPattern}]: `)) ||
            checksumPattern;
          plugin.platform[platformName]["checksum-file"] = checksumFile;
        }
      }
    }
  }

  return plugin;
}

function parseArgs(args: string[]): {
  options: GenerationOptions;
  githubUrl: string;
} {
  const options: GenerationOptions = {
    interactive: true,
    autoSave: false,
    outputFile: undefined,
  };

  let githubUrl = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--auto" || arg === "-a") {
      options.interactive = false;
      options.autoSave = true;
    } else if (arg === "--output" || arg === "-o") {
      options.outputFile = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: node --experimental-strip-types scripts/generate-proto-plugin.ts [options] <github-url>

Options:
  --auto, -a              Run in automated mode (no prompts)
  --output, -o <file>     Specify output file path
  --help, -h              Show this help message

Examples:
  # Interactive mode
  node --experimental-strip-types scripts/generate-proto-plugin.ts https://github.com/terrastruct/d2

  # Automated mode
  node --experimental-strip-types scripts/generate-proto-plugin.ts --auto https://github.com/terrastruct/d2

  # Custom output file
  node --experimental-strip-types scripts/generate-proto-plugin.ts --auto --output custom.json https://github.com/terrastruct/d2
`);
      process.exit(0);
    } else if (!githubUrl && arg.includes("github.com")) {
      githubUrl = arg;
    }
  }

  if (!githubUrl) {
    throw new Error("GitHub URL is required");
  }

  return { options, githubUrl };
}

async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.log(
        "Usage: node --experimental-strip-types scripts/generate-proto-plugin.ts [--auto] <github-url>",
      );
      console.log("Use --help for more options");
      process.exit(1);
    }

    const { options, githubUrl } = parseArgs(args);
    const plugin = await generateProtoPlugin(githubUrl, options);

    console.log("\n✅ Generated proto plugin configuration:\n");
    console.log(JSON.stringify(plugin, null, 2));

    // Handle file saving
    let shouldSave = options.autoSave;
    let filename = options.outputFile;

    if (options.interactive && !shouldSave) {
      const save = await prompt("\n💾 Save to file? (y/n) [y]: ");
      shouldSave = save.toLowerCase() !== "n";
    }

    if (shouldSave) {
      if (!filename) {
        if (options.interactive) {
          filename =
            (await prompt(`Filename [proto/${plugin.name}.json]: `)) ||
            `proto/${plugin.name}.json`;
        } else {
          filename = `proto/${plugin.name}-auto.json`;
        }
      }

      writeFileSync(filename, JSON.stringify(plugin, null, 2) + "\n");
      console.log(`\n✅ Saved to ${filename}`);
    }
  } catch (error) {
    console.error(
      "❌ Error:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  } finally {
    if (rl) {
      rl.close();
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
