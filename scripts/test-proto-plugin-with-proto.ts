#!/usr/bin/env node --experimental-strip-types

/**
 * Test a proto plugin JSON file using proto to install and verify the tool
 *
 * Cross-runtime compatible script that works with:
 * - Node.js: node --experimental-strip-types scripts/test-proto-plugin-with-proto.ts <plugin-json-file>
 * - Bun: bun scripts/test-proto-plugin-with-proto.ts <plugin-json-file>
 * - Deno: deno run -A scripts/test-proto-plugin-with-proto.ts <plugin-json-file>
 *
 * Usage:
 *   <runtime> scripts/test-proto-plugin-with-proto.ts <plugin-json-file>
 *   <runtime> scripts/test-proto-plugin-with-proto.ts --version 1.0.0 <plugin-json-file>
 */

import { execSync } from "node:child_process";
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { consola } from "consola";
import {
	type ProtoPlugin,
	type TestOptions,
	detectRuntime,
	fetchLatestVersion,
} from "./shared-utils.ts";

function checkProtoInstalled(): void {
	try {
		execSync("proto --version", { stdio: "pipe" });
		consola.success("Proto is installed and available");
	} catch (_error) {
		consola.error(
			"Proto is not installed or not in PATH. Please install proto first: https://moonrepo.dev/proto",
		);
		process.exit(1);
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

	consola.log(`📦 Installing plugin to proto: ${targetPath}`);

	// Create plugins directory if it doesn't exist
	mkdirSync(pluginsDir, { recursive: true });

	// Copy the plugin file
	copyFileSync(pluginPath, targetPath);

	consola.success(`Plugin installed to: ${targetPath}`);
	return targetPath;
}

function installToolWithProto(toolName: string, version?: string): void {
	const command = version
		? `proto install ${toolName} ${version}`
		: `proto install ${toolName}`;

	consola.log(`🔧 Installing tool: ${command}`);

	try {
		const output = execSync(command, {
			encoding: "utf8",
			stdio: "pipe",
		});

		if (output) {
			console.group("📄 Install output:");
			consola.log(output);
			console.groupEnd();
		}

		const versionDisplay = version ? ` ${version}` : "";
		consola.success(`Tool ${toolName}${versionDisplay} installed successfully`);
	} catch (error) {
		throw new Error(
			`Failed to install ${toolName}: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

function testToolWithProto(
	toolName: string,
	version?: string,
): { version?: string; success: boolean; output: string } {
	consola.log(`🧪 Testing tool: ${toolName}`);

	// Pin the version if provided to make proto run work
	if (version) {
		try {
			consola.log(`  Pinning version: proto pin ${toolName} ${version}`);
			execSync(`proto pin ${toolName} ${version}`, { stdio: "pipe" });
		} catch (_error) {
			consola.log(
				`    Failed to pin version: ${
					_error instanceof Error ? _error.message : String(_error)
				}`,
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
	} catch (_error) {
		// Ignore errors - this is just a best effort
	}

	// Try common version flags using proto run
	const versionFlags = ["--version", "-v", "version"];

	for (const flag of versionFlags) {
		try {
			consola.log(`  Trying: proto run ${toolName} -- ${flag}`);
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
			consola.log(
				`    Failed with ${flag}: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}

	// Try just running the tool without arguments
	try {
		consola.log(`  Trying: proto run ${toolName}`);
		const output = execSync(`proto run ${toolName}`, {
			encoding: "utf8",
			timeout: 10000,
			stdio: "pipe",
		});

		return {
			success: true,
			output: output.trim(),
		};
	} catch (_error) {
		// This might be expected if the tool requires arguments

		consola.log(
			"    Tool execution without args failed (this might be normal)",
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
	} catch (_error) {
		consola.log("Could not get installed version");
	}

	return null;
}

async function testProtoPlugin(
	pluginPath: string,
	options: TestOptions,
): Promise<void> {
	consola.log(`🔧 Testing proto plugin: ${pluginPath}\n`);

	// Check if proto is installed
	checkProtoInstalled();

	// Read and parse plugin file
	const pluginContent = readFileSync(pluginPath, "utf8");
	const plugin: ProtoPlugin = JSON.parse(pluginContent);

	consola.log(`📋 Plugin: ${plugin.name}`);
	consola.log(`📝 Description: ${plugin.description}`);
	consola.log(`🔗 Repository: ${plugin.resolve["git-url"]}\n`);

	// Determine version to test
	let version = options.version;
	if (!version) {
		consola.start("🔍 Fetching latest version...");
		version = await fetchLatestVersion(plugin.resolve["git-url"]);
		consola.log(`📌 Latest version: ${version}\n`);
	}

	let installedPluginPath: string | null = null;

	try {
		// Install the plugin to proto
		installedPluginPath = installPluginToProto(pluginPath, plugin.name);

		// Install the tool using proto
		installToolWithProto(plugin.name, version);

		// Get the actually installed version
		const installedVersion = getInstalledVersion(plugin.name);
		consola.log(`📌 Installed version: ${installedVersion || "unknown"}\n`);

		// Test the tool
		const testResult = testToolWithProto(plugin.name, version);

		consola.log("\n🎯 Test Results:");
		consola.success("Plugin installation: Success");
		consola.success("Tool installation: Success");
		testResult.success
			? consola.success("Tool execution: Success")
			: consola.error("Tool execution: Failed");

		if (testResult.version) {
			consola.log(`📌 Detected version: ${testResult.version}`);
			if (
				testResult.version === version ||
				testResult.version === installedVersion
			) {
				consola.success(
					`Version match: Expected ${version}, got ${testResult.version}`,
				);
			} else {
				console.warn(
					` Version mismatch: Expected ${version}, got ${testResult.version}`,
				);
			}
		}

		if (options.verbose && testResult.output) {
			consola.log(`\n📄 Tool output:\n${testResult.output}`);
		}

		// Show where the tool is installed
		const toolsDir = getProtoToolsDir();
		consola.log(`\n📁 Tool installed in: ${join(toolsDir, plugin.name)}`);
	} finally {
		// Cleanup
		if (options.cleanup !== false) {
			consola.log("\n🧹 Cleaning up...");

			// Uninstall the tool
			try {
				execSync(`proto uninstall ${plugin.name}`, { stdio: "pipe" });
				consola.success(`Uninstalled tool: ${plugin.name}`);
			} catch (_error) {
				console.warn(` Could not uninstall tool: ${plugin.name}`);
			}

			// Remove the plugin file
			if (installedPluginPath && existsSync(installedPluginPath)) {
				rmSync(installedPluginPath);
				consola.success(`Removed plugin file: ${installedPluginPath}`);
			}
		} else {
			consola.log("\n📁 Plugin and tool preserved for manual inspection");
			if (installedPluginPath) {
				consola.log(`Plugin file: ${installedPluginPath}`);
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
			const runtime = detectRuntime();
			consola.log(`
Usage: ${runtime.command} scripts/test-proto-plugin-with-proto.ts [options] <plugin-json-file>

Options:
  --version, -v <version>    Test specific version (default: latest)
  --no-cleanup              Don't clean up installed tools and plugins
  --verbose                 Show detailed output
  --help, -h                Show this help message
`);

			consola.box({
				title: `Examples (${runtime.name})`,
				message: `# Test with latest version
${runtime.command} scripts/test-proto-plugin-with-proto.ts plugins/d2.json

# Test specific version
${runtime.command} scripts/test-proto-plugin-with-proto.ts --version 0.7.0 plugins/d2.json

# Keep tools installed for inspection
${runtime.command} scripts/test-proto-plugin-with-proto.ts --no-cleanup plugins/d2.json`,
				style: {
					borderColor: "cyan",
					borderStyle: "round",
				},
			});

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
			const runtime = detectRuntime();
			consola.log(
				`Usage: ${runtime.command} scripts/test-proto-plugin-with-proto.ts <plugin-json-file>`,
			);
			consola.log("Use --help for more options");
			process.exit(1);
		}

		const { options, pluginPath } = parseArgs(args);
		await testProtoPlugin(pluginPath, options);

		consola.log("\n🎉 Test completed successfully!");
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
