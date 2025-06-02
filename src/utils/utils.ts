/**
 * Shared utilities for proto plugin scripts
 * Cross-runtime compatible utilities for Node.js, Bun, and Deno
 */

import { execSync } from "node:child_process";
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import process from "node:process";
import { consola } from "consola";
import type {
	ActTestOptions,
	GitHubRelease,
	GitHubRepository,
	ParsedGitHubUrl,
	ProtoPlugin,
	ProtoToolsConfig,
	RuntimeInfo,
	TestOptions,
} from "../types/types.ts";

// Re-export types for convenience
export type {
	AnalyzedAssets,
	BaseProtoRegistryEntry,
	CommandLineArgs,
	GenerationOptions,
	GitHubAsset,
	GitHubRelease,
	GitHubRepository,
	LocalPlugin,
	ParsedGitHubUrl,
	PlatformAssets,
	PlatformConfig,
	ProtoPlugin,
	ProtoRegistryEntry,
	ProtoToolsConfig,
	RuntimeInfo,
	TestOptions,
} from "../types/types.ts";

// Runtime globals type declarations
declare const Bun: unknown;
declare const Deno: unknown;

// ============================================================================
// Runtime Detection
// ============================================================================

export function detectRuntime(): RuntimeInfo {
	if (typeof Bun !== "undefined") {
		return { name: "Bun", command: "bun" };
	}
	if (typeof Deno !== "undefined") {
		return { name: "Deno", command: "deno run -A" };
	}
	return { name: "Node.js", command: "node --experimental-strip-types" };
}

// ============================================================================
// Help Display Utilities
// ============================================================================

export function showUsage(scriptName: string, usage: string): void {
	const runtime = detectRuntime();
	consola.log(`Usage: ${runtime.command} ${scriptName} ${usage}`);
	consola.log("Use --help for more options");
	process.exit(1);
}

export function showHelp(
	scriptName: string,
	usage: string,
	options: string[],
	examples: string[],
	boxColor: "cyan" | "green" | "blue" | "magenta" = "cyan",
): void {
	const runtime = detectRuntime();

	consola.log(`
Usage: ${runtime.command} ${scriptName} ${usage}

Options:
${options.map((opt) => `  ${opt}`).join("\n")}
`);

	consola.box({
		title: `Examples (${runtime.name})`,
		message: examples
			.map((example) =>
				example
					.replace(/<runtime>/g, runtime.command)
					.replace(/<script>/g, scriptName),
			)
			.join("\n\n"),
		style: {
			borderColor: boxColor,
			borderStyle: "round",
		},
	});

	process.exit(0);
}

// ============================================================================
// GitHub API Utilities
// ============================================================================

export function parseGitHubUrl(url: string): ParsedGitHubUrl {
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

export async function fetchGitHubRelease(
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
			`Failed to fetch release data: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

export async function fetchGitHubRepo(
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
			`Failed to fetch repository data: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

// ============================================================================
// File System Utilities
// ============================================================================

export function readProtoPlugin(filePath: string): ProtoPlugin {
	try {
		const content = readFileSync(filePath, "utf8");
		return JSON.parse(content) as ProtoPlugin;
	} catch (error) {
		throw new Error(
			`Failed to read plugin file ${filePath}: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

export function writeProtoPlugin(filePath: string, plugin: ProtoPlugin): void {
	try {
		writeFileSync(filePath, `${JSON.stringify(plugin, null, 2)}\n`);
	} catch (error) {
		throw new Error(
			`Failed to write plugin file ${filePath}: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

// ============================================================================
// Argument Parsing Utilities
// ============================================================================

export function hasFlag(args: string[], ...flags: string[]): boolean {
	return flags.some((flag) => args.includes(flag));
}

export function getFlagValue(
	args: string[],
	...flags: string[]
): string | undefined {
	for (const flag of flags) {
		const index = args.indexOf(flag);
		if (index !== -1 && index + 1 < args.length) {
			return args[index + 1];
		}
	}
	return undefined;
}

// ============================================================================
// Cross-Runtime Command Execution
// ============================================================================

export async function execCommand(
	command: string,
): Promise<{ stdout: string; stderr: string; success: boolean }> {
	const runtime = detectRuntime();

	try {
		if (runtime.name === "Deno") {
			// @ts-ignore - Deno global is available in Deno runtime
			const cmd = new Deno.Command("sh", {
				args: ["-c", command],
				stdout: "piped",
				stderr: "piped",
			});
			const { stdout, stderr, success } = await cmd.output();
			return {
				stdout: new TextDecoder().decode(stdout),
				stderr: new TextDecoder().decode(stderr),
				success,
			};
		}

		if (runtime.name === "Bun") {
			// @ts-ignore - Bun global is available in Bun runtime
			const proc = Bun.spawn(["sh", "-c", command], {
				stdout: "pipe",
				stderr: "pipe",
			});
			const [stdout, stderr] = await Promise.all([
				new Response(proc.stdout).text(),
				new Response(proc.stderr).text(),
			]);
			await proc.exited;
			return {
				stdout,
				stderr,
				success: proc.exitCode === 0,
			};
		}

		// Node.js
		const { spawn } = await import("node:child_process");
		return new Promise((resolve) => {
			const child = spawn("sh", ["-c", command], { stdio: "pipe" });
			let stdout = "";
			let stderr = "";

			child.stdout?.on("data", (data: unknown) => {
				stdout += data?.toString();
			});
			child.stderr?.on("data", (data: unknown) => {
				stderr += data?.toString();
			});

			child.on("close", (code: number | null) => {
				resolve({
					stdout,
					stderr,
					success: code === 0,
				});
			});
		});
	} catch (error) {
		return {
			stdout: "",
			stderr: error instanceof Error ? error.message : String(error),
			success: false,
		};
	}
}

// ============================================================================
// TOML Parsing Utilities
// ============================================================================

export function parseToml(content: string): Record<string, unknown> {
	// Simple TOML parser for .prototools files
	const lines = content.split("\n");
	const result: Record<string, unknown> = {};
	let currentSection = "";

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
			currentSection = trimmed.slice(1, -1);
			if (!result[currentSection]) {
				result[currentSection] = {};
			}
		} else if (trimmed.includes("=")) {
			const [key, ...valueParts] = trimmed.split("=");
			const value = valueParts
				.join("=")
				.trim()
				.replace(/^["']|["']$/g, "");

			if (currentSection) {
				(result[currentSection] as Record<string, string>)[key.trim()] = value;
			} else {
				result[key.trim()] = value;
			}
		}
	}

	return result;
}

// ============================================================================
// Cross-Runtime User Input
// ============================================================================

export async function simplePrompt(message: string): Promise<string> {
	const runtime = detectRuntime();

	if (runtime.name === "Deno") {
		// @ts-ignore - prompt is available in Deno
		return prompt(message) || "";
	}

	if (runtime.name === "Bun") {
		// Use Bun's built-in prompt if available, otherwise fallback
		// @ts-ignore - prompt might be available in Bun
		if (typeof prompt !== "undefined") {
			return prompt(message) || "";
		}
	}

	// Node.js fallback using readline
	const readline = await import("node:readline");
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question(message, (answer: string) => {
			rl.close();
			resolve(answer);
		});
	});
}

// ============================================================================
// Proto Tools Configuration
// ============================================================================

export function loadCurrentProtoTools(): string[] {
	try {
		if (!existsSync(".prototools")) {
			consola.info("No .prototools file found");
			return [];
		}

		const content = readFileSync(".prototools", "utf8");
		const currentPrototools = parseToml(content) as ProtoToolsConfig;
		return Object.values(currentPrototools.plugins || {});
	} catch (error) {
		consola.error("Failed to load .prototools:", error);
		return [];
	}
}

// Argument parsing
export function parseArgs(args: string[]): {
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
Usage: node --experimental-strip-types src/test-proto-plugin-with-proto.ts [options] <plugin-json-file>

Options:
  --version, -v <version>    Test specific version (default: latest)
  --no-cleanup              Don't clean up installed tools and plugins
  --verbose                 Show detailed output
  --help, -h                Show this help message

Examples:
  # Test with latest version
  node --experimental-strip-types src/test-proto-plugin-with-proto.ts plugins/d2.json

  # Test specific version
  node --experimental-strip-types src/test-proto-plugin-with-proto.ts --version 0.7.0 plugins/d2.json

  # Keep tools installed for inspection
  node --experimental-strip-types src/test-proto-plugin-with-proto.ts --no-cleanup plugins/d2.json
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

// Proto CLI utilities
export function checkProtoInstalled(): void {
	try {
		execSync("proto --version", { stdio: "pipe" });
		console.log("✅ Proto is installed and available");
	} catch (error) {
		throw new Error(
			"Proto is not installed or not in PATH. Please install proto first: https://moonrepo.dev/proto",
		);
	}
}

export function getProtoToolsDir(): string {
	const protoHome = process.env.PROTO_HOME || join(homedir(), ".proto");
	return join(protoHome, "tools");
}

export function installPluginToProto(
	pluginPath: string,
	pluginName: string,
): string {
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

export function installToolWithProto(toolName: string, version?: string): void {
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
			`Failed to install ${toolName}: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

export function testToolWithProto(
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
				`    Could not pin version: ${
					error instanceof Error ? error.message : String(error)
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
				`    Failed with ${flag}: ${
					error instanceof Error ? error.message : String(error)
				}`,
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

export function getInstalledVersion(toolName: string): string | null {
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

export async function fetchLatestVersion(gitUrl: string): Promise<string> {
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
			`Failed to fetch latest version: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

// Act CLI utilities
export async function checkActInstallation(): Promise<boolean> {
	try {
		// First try direct act command
		await execSync("act --version", { stdio: "pipe" });
		return true;
	} catch (error) {
		// Try with proto
		try {
			await execSync("proto run act -- --version", { stdio: "pipe" });
			return true;
		} catch (protoError) {
			return false;
		}
	}
}

export function installActWithProto(): boolean {
	console.log("📦 Installing act CLI with proto...");

	try {
		execSync("proto install act", { stdio: "inherit" });
		console.log("✅ Act CLI installed successfully with proto");
		return true;
	} catch (error) {
		console.log("❌ Failed to install act with proto");
		return false;
	}
}

export function getActCommand(): string {
	// Check if act is available directly
	try {
		execSync("act --version", { stdio: "pipe" });
		return "act";
	} catch (error) {
		// Use proto run
		return "proto run act --";
	}
}

export function createActConfig(): void {
	const actrcPath = ".actrc";
	const actrcContent = `# Act configuration for proto-plugins testing
--platform ubuntu-latest=catthehacker/ubuntu:act-latest
--platform ubuntu-22.04=catthehacker/ubuntu:act-22.04
--platform ubuntu-20.04=catthehacker/ubuntu:act-20.04
--platform macos-latest=catthehacker/ubuntu:act-latest
--platform macos-12=catthehacker/ubuntu:act-latest
--platform windows-latest=catthehacker/ubuntu:act-latest
--platform windows-2022=catthehacker/ubuntu:act-latest
--container-architecture linux/amd64
--artifact-server-path /tmp/artifacts
`;

	if (!existsSync(actrcPath)) {
		writeFileSync(actrcPath, actrcContent);
		console.log("✅ Created .actrc configuration file");
	}
}

export function createSecretsFile(): string {
	const secretsPath = ".act-secrets";
	const secretsContent = `GITHUB_TOKEN=ghp_fake_token_for_local_testing
NODE_VERSION=22.6.0
`;

	if (!existsSync(secretsPath)) {
		writeFileSync(secretsPath, secretsContent);
		console.log("✅ Created .act-secrets file");
	}

	return secretsPath;
}

export function createEventFile(
	event: string,
	inputs?: Record<string, any>,
): string {
	const eventPath = ".act-event.json";

	let eventData: any = {};

	switch (event) {
		case "workflow_dispatch":
			eventData = {
				inputs: inputs || {},
			};
			break;
		case "push":
			eventData = {
				ref: "refs/heads/feat/grit",
				repository: {
					name: "proto-plugins",
					full_name: "continuous-quality-dev/proto-plugins",
				},
			};
			break;
		case "pull_request":
			eventData = {
				action: "opened",
				pull_request: {
					head: {
						ref: "feat/test-workflows",
					},
					base: {
						ref: "main",
					},
				},
			};
			break;
		default:
			eventData = {};
	}

	writeFileSync(eventPath, JSON.stringify(eventData, null, 2));
	console.log(`✅ Created event file for ${event}`);

	return eventPath;
}

export function getAvailableWorkflows(): string[] {
	const workflowsDir = ".github/workflows";
	if (!existsSync(workflowsDir)) {
		return [];
	}

	try {
		const files = execSync(
			`find ${workflowsDir} -name "*.yml" -o -name "*.yaml"`,
			{
				encoding: "utf8",
			},
		)
			.trim()
			.split("\n")
			.filter((f) => f);

		return files.map((f) => f.replace(`${workflowsDir}/`, ""));
	} catch (error) {
		return [];
	}
}
