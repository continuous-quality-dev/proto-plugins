#!/usr/bin/env node --experimental-strip-types

/**
 * Test a proto plugin JSON file using proto to install and verify the tool
 * Usage:
 *   node --experimental-strip-types scripts/test-proto-plugin-with-proto.ts <plugin-json-file>
 *   node --experimental-strip-types scripts/test-proto-plugin-with-proto.ts --version 1.0.0 <plugin-json-file>
 */

import { readFileSync, existsSync, copyFileSync, mkdirSync, rmSync } from "fs";
import { join, dirname, basename } from "path";
import { execSync } from "child_process";
import { homedir } from "os";

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

interface PlatformConfig {
  "download-file": string;
  "archive-prefix": string;
  "bin-path": string;
  "checksum-file"?: string;
}

interface TestOptions {
  version?: string;
  cleanup?: boolean;
  verbose?: boolean;
}

function checkProtoInstalled(): void {
  try {
    execSync("proto --version", { stdio: "pipe" });
    console.log("✅ Proto is installed and available");
  } catch (error) {
    throw new Error(
      "Proto is not installed or not in PATH. Please install proto first: https://moonrepo.dev/proto",
    );
  }
}

function getProtoToolsDir(): string {
  const protoHome = process.env.PROTO_HOME || join(homedir(), ".proto");
  return join(protoHome, "tools");
}

function installPluginToProto(pluginPath: string, pluginName: string): string {
  const protoHome = process.env.PROTO_HOME || join(homedir(), ".proto");
  const pluginsDir = join(protoHome, "plugins");
  const targetPath = join(pluginsDir, `${pluginName}.json`);

  console.log(`📦 Installing plugin to proto: ${targetPath}`);

  // Create plugins directory if it doesn't exist
  mkdirSync(pluginsDir, { recursive: true });

  // Copy the plugin file
  copyFileSync(pluginPath, targetPath);

  console.log(`✅ Plugin installed to: ${targetPath}`);
  return targetPath;
}

function installToolWithProto(toolName: string, version?: string): void {
  const command = version
    ? `proto install ${toolName} ${version}`
    : `proto install ${toolName}`;

  console.log(`🔧 Installing tool: ${command}`);

  try {
    const output = execSync(command, {
      encoding: "utf8",
      stdio: "pipe",
    });

    if (output) {
      console.log(`📄 Install output:\n${output}`);
    }

    const versionDisplay = version ? ` ${version}` : "";
    console.log(`✅ Tool ${toolName}${versionDisplay} installed successfully`);
  } catch (error) {
    throw new Error(
      `Failed to install ${toolName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function testToolWithProto(
  toolName: string,
  version?: string,
): { version?: string; success: boolean; output: string } {
  console.log(`🧪 Testing tool: ${toolName}`);

  // Pin the version if provided to make proto run work
  if (version) {
    try {
      console.log(`  Pinning version: proto pin ${toolName} ${version}`);
      execSync(`proto pin ${toolName} ${version}`, { stdio: "pipe" });
    } catch (error) {
      console.log(
        `    Could not pin version: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Try to make binaries executable (fix permission issues)
  try {
    const toolsDir = getProtoToolsDir();
    const toolDir = join(toolsDir, toolName);
    if (version) {
      const versionDir = join(toolDir, version);
      execSync(
        `find "${versionDir}" -type f -name "${toolName}" -exec chmod +x {} \\; 2>/dev/null || true`,
        { stdio: "pipe" },
      );
    }
  } catch (error) {
    // Ignore errors - this is just a best effort
  }

  // Try common version flags using proto run
  const versionFlags = ["--version", "-v", "version"];

  for (const flag of versionFlags) {
    try {
      console.log(`  Trying: proto run ${toolName} -- ${flag}`);
      const output = execSync(`proto run ${toolName} -- ${flag}`, {
        encoding: "utf8",
        timeout: 15000,
        stdio: "pipe",
      });

      // Look for version patterns in output
      const versionMatch = output.match(/v?(\d+\.\d+\.\d+[^\s]*)/);
      if (versionMatch) {
        return {
          version: versionMatch[1],
          success: true,
          output: output.trim(),
        };
      }

      return {
        success: true,
        output: output.trim(),
      };
    } catch (error) {
      console.log(
        `    Failed with ${flag}: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
  }

  // Try just running the tool without arguments
  try {
    console.log(`  Trying: proto run ${toolName}`);
    const output = execSync(`proto run ${toolName}`, {
      encoding: "utf8",
      timeout: 10000,
      stdio: "pipe",
    });

    return {
      success: true,
      output: output.trim(),
    };
  } catch (error) {
    // This might be expected if the tool requires arguments
    console.log(
      `    Tool execution without args failed (this might be normal)`,
    );
  }

  return {
    success: false,
    output: "All test commands failed",
  };
}

function getInstalledVersion(toolName: string): string | null {
  try {
    const output = execSync(`proto list ${toolName}`, {
      encoding: "utf8",
      stdio: "pipe",
    });

    // Parse the output to find installed versions
    const lines = output.split("\n");
    for (const line of lines) {
      if (line.includes("✓") || line.includes("*")) {
        const versionMatch = line.match(/(\d+\.\d+\.\d+[^\s]*)/);
        if (versionMatch) {
          return versionMatch[1];
        }
      }
    }
  } catch (error) {
    console.log("Could not get installed version");
  }

  return null;
}

async function fetchLatestVersion(gitUrl: string): Promise<string> {
  const match = gitUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error(
      "Only GitHub repositories are supported for version fetching",
    );
  }

  const [, owner, repo] = match;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const release = (await response.json()) as { tag_name: string };
    return release.tag_name.replace(/^v/, ""); // Remove 'v' prefix if present
  } catch (error) {
    throw new Error(
      `Failed to fetch latest version: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function testProtoPlugin(
  pluginPath: string,
  options: TestOptions,
): Promise<void> {
  console.log(`🔧 Testing proto plugin: ${pluginPath}\n`);

  // Check if proto is installed
  checkProtoInstalled();

  // Read and parse plugin file
  const pluginContent = readFileSync(pluginPath, "utf8");
  const plugin: ProtoPlugin = JSON.parse(pluginContent);

  console.log(`📋 Plugin: ${plugin.name}`);
  console.log(`📝 Description: ${plugin.description}`);
  console.log(`🔗 Repository: ${plugin.resolve["git-url"]}\n`);

  // Determine version to test
  let version = options.version;
  if (!version) {
    console.log("🔍 Fetching latest version...");
    version = await fetchLatestVersion(plugin.resolve["git-url"]);
    console.log(`📌 Latest version: ${version}\n`);
  }

  let installedPluginPath: string | null = null;

  try {
    // Install the plugin to proto
    installedPluginPath = installPluginToProto(pluginPath, plugin.name);

    // Install the tool using proto
    installToolWithProto(plugin.name, version);

    // Get the actually installed version
    const installedVersion = getInstalledVersion(plugin.name);
    console.log(`📌 Installed version: ${installedVersion || "unknown"}\n`);

    // Test the tool
    const testResult = testToolWithProto(plugin.name, version);

    console.log("\n🎯 Test Results:");
    console.log(`✅ Plugin installation: Success`);
    console.log(`✅ Tool installation: Success`);
    console.log(
      `${testResult.success ? "✅" : "❌"} Tool execution: ${testResult.success ? "Success" : "Failed"}`,
    );

    if (testResult.version) {
      console.log(`📌 Detected version: ${testResult.version}`);
      if (
        testResult.version === version ||
        testResult.version === installedVersion
      ) {
        console.log(
          `✅ Version match: Expected ${version}, got ${testResult.version}`,
        );
      } else {
        console.log(
          `⚠️  Version mismatch: Expected ${version}, got ${testResult.version}`,
        );
      }
    }

    if (options.verbose && testResult.output) {
      console.log(`\n📄 Tool output:\n${testResult.output}`);
    }

    // Show where the tool is installed
    const toolsDir = getProtoToolsDir();
    console.log(`\n📁 Tool installed in: ${join(toolsDir, plugin.name)}`);
  } finally {
    // Cleanup
    if (options.cleanup !== false) {
      console.log(`\n🧹 Cleaning up...`);

      // Uninstall the tool
      try {
        execSync(`proto uninstall ${plugin.name}`, { stdio: "pipe" });
        console.log(`✅ Uninstalled tool: ${plugin.name}`);
      } catch (error) {
        console.log(`⚠️  Could not uninstall tool: ${plugin.name}`);
      }

      // Remove the plugin file
      if (installedPluginPath && existsSync(installedPluginPath)) {
        rmSync(installedPluginPath);
        console.log(`✅ Removed plugin file: ${installedPluginPath}`);
      }
    } else {
      console.log(`\n📁 Plugin and tool preserved for manual inspection`);
      if (installedPluginPath) {
        console.log(`Plugin file: ${installedPluginPath}`);
      }
    }
  }
}

function parseArgs(args: string[]): {
  options: TestOptions;
  pluginPath: string;
} {
  const options: TestOptions = {
    cleanup: true,
    verbose: false,
  };

  let pluginPath = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--version" || arg === "-v") {
      options.version = args[++i];
    } else if (arg === "--no-cleanup") {
      options.cleanup = false;
    } else if (arg === "--verbose") {
      options.verbose = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: node --experimental-strip-types scripts/test-proto-plugin-with-proto.ts [options] <plugin-json-file>

Options:
  --version, -v <version>    Test specific version (default: latest)
  --no-cleanup              Don't clean up installed tools and plugins
  --verbose                 Show detailed output
  --help, -h                Show this help message

Examples:
  # Test with latest version
  node --experimental-strip-types scripts/test-proto-plugin-with-proto.ts proto/d2-auto.json

  # Test specific version
  node --experimental-strip-types scripts/test-proto-plugin-with-proto.ts --version 0.7.0 proto/d2-auto.json

  # Keep tools installed for inspection
  node --experimental-strip-types scripts/test-proto-plugin-with-proto.ts --no-cleanup proto/d2-auto.json
`);
      process.exit(0);
    } else if (!pluginPath && arg.endsWith(".json")) {
      pluginPath = arg;
    }
  }

  if (!pluginPath) {
    throw new Error("Plugin JSON file is required");
  }

  return { options, pluginPath };
}

async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.log(
        "Usage: node --experimental-strip-types scripts/test-proto-plugin-with-proto.ts <plugin-json-file>",
      );
      console.log("Use --help for more options");
      process.exit(1);
    }

    const { options, pluginPath } = parseArgs(args);
    await testProtoPlugin(pluginPath, options);

    console.log("\n🎉 Test completed successfully!");
  } catch (error) {
    console.error(
      "\n❌ Test failed:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
