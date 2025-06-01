#!/usr/bin/env node --experimental-strip-types

/**
 * Generate a proto plugin JSON from a GitHub release URL using Stricli
 *
 * Cross-runtime compatible script that works with:
 * - Node.js: node --experimental-strip-types scripts/generate-proto-plugin-stricli.ts <github-url>
 * - Bun: bun scripts/generate-proto-plugin-stricli.ts <github-url>
 * - Deno: deno run -A scripts/generate-proto-plugin-stricli.ts <github-url>
 */

import { writeFileSync } from "node:fs";
import process from "node:process";
import readline from "node:readline";
import { consola } from "consola";
// Note: stricli imports are included for future enhancement
// import { buildApplication, buildCommand, run } from "@stricli/core";
import {
	type AnalyzedAssets,
	type GenerationOptions,
	type GitHubAsset,
	type PlatformAssets,
	type ProtoPlugin,
	detectRuntime,
	fetchGitHubRelease,
	fetchGitHubRepo,
	parseGitHubUrl,
	showHelp,
} from "./shared-utils.ts";

// Define types for the command context (for future stricli integration)
interface CommandFlags {
	auto?: boolean;
	output?: string;
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
	_platform: string,
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

function generateArchivePrefix(
	downloadFile: string,
	_platform: string,
): string {
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
	consola.log("🔍 Analyzing GitHub repository...\n");

	const { owner, repo } = parseGitHubUrl(githubUrl);
	consola.log(`Repository: ${owner}/${repo}`);

	const [release, repoData] = await Promise.all([
		fetchGitHubRelease(owner, repo),
		fetchGitHubRepo(owner, repo),
	]);

	consola.log(`Latest release: ${release.tag_name}`);
	consola.log(`Assets found: ${release.assets.length}`);
	consola.log(`Repository description: ${repoData.description}\n`);

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

	consola.log("\n📦 Detected platforms and assets:");
	for (const [platform, assets] of Object.entries(platforms)) {
		if (assets.length > 0) {
			consola.log(`  ${platform}: ${assets.length} assets`);
			for (const asset of assets) {
				consola.log(`    - ${asset.name}`);
			}
		}
	}

	consola.log(`\n🏗️  Detected architectures: ${architectures.join(", ")}\n`);

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
					? (await prompt("Architecture mapping for aarch64 [arm64]: ")) ||
						"arm64"
					: "arm64";
				plugin.install.arch.aarch64 = mapping;
			} else if (arch === "x86_64") {
				const mapping = options.interactive
					? (await prompt("Architecture mapping for x86_64 [amd64]: ")) ||
						"amd64"
					: "amd64";
				plugin.install.arch.x86_64 = mapping;
			}
		}
	}

	// Configure platforms
	for (const [platformName, assets] of Object.entries(platforms)) {
		if (assets.length === 0) continue;

		consola.log(
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
				(a: GitHubAsset) =>
					a.name.includes("sha256") || a.name.includes("checksum"),
			);
			if (hasChecksum) {
				const useChecksum = await prompt("Include checksum file? (y/n) [n]: ");
				if (useChecksum.toLowerCase() === "y") {
					const checksumPattern = `${downloadFile}.sha256`;
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

// Implementation function for the command
async function generateProtoPluginImpl(
	_context: unknown,
	githubUrl: string,
	flags: CommandFlags,
): Promise<void> {
	try {
		const options: GenerationOptions = {
			interactive: !flags.auto,
			autoSave: !!flags.auto,
			outputFile: flags.output,
		};

		const plugin = await generateProtoPlugin(githubUrl, options);

		consola.log("\n✅ Generated proto plugin configuration:\n");
		consola.log(JSON.stringify(plugin, null, 2));

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
						(await prompt(`Filename [plugins/${plugin.name}.json]: `)) ||
						`plugins/${plugin.name}.json`;
				} else {
					filename = `plugins/${plugin.name}-auto.json`;
				}
			}

			writeFileSync(filename, `${JSON.stringify(plugin, null, 2)}\n`);
			consola.success(`Saved to ${filename}`);
		}
	} catch (error) {
		consola.error(
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

// For now, let's use a simple argument parsing approach
// This demonstrates the concept while we work out the stricli API details
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
			showHelp(
				"scripts/generate-proto-plugin-stricli.ts",
				"[options] <github-url>",
				[
					"--auto, -a              Run in automated mode (no prompts)",
					"--output, -o <file>     Specify output file path",
					"--help, -h              Show this help message",
				],
				[
					"# Interactive mode\n<runtime> <script> https://github.com/terrastruct/d2",
					"# Automated mode\n<runtime> <script> --auto https://github.com/terrastruct/d2",
					"# Custom output file\n<runtime> <script> --auto --output custom.json https://github.com/terrastruct/d2",
				],
				"green",
			);
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
			const runtime = detectRuntime();
			consola.log(
				`Usage: ${runtime.command} scripts/generate-proto-plugin-stricli.ts [--auto] <github-url>`,
			);
			consola.log("Use --help for more options");
			process.exit(1);
		}

		const { options, githubUrl } = parseArgs(args);
		const plugin = await generateProtoPlugin(githubUrl, options);

		consola.log("\n✅ Generated proto plugin configuration:\n");
		consola.log(JSON.stringify(plugin, null, 2));

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
						(await prompt(`Filename [plugins/${plugin.name}.json]: `)) ||
						`plugins/${plugin.name}.json`;
				} else {
					filename = `plugins/${plugin.name}-auto.json`;
				}
			}

			writeFileSync(filename, `${JSON.stringify(plugin, null, 2)}\n`);
			consola.success(`Saved to ${filename}`);
		}
	} catch (error) {
		consola.error(
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

// Export the implementation for potential stricli integration
export { generateProtoPluginImpl };

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
