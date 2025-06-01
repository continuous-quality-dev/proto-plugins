/**
 * Shared utilities for proto plugin scripts
 * Cross-runtime compatible utilities for Node.js, Bun, and Deno
 */

import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { consola } from "consola";
import type {
	GitHubRelease,
	GitHubRepository,
	ParsedGitHubUrl,
	ProtoPlugin,
	RuntimeInfo,
} from "./types.ts";

// Re-export types for convenience
export type {
	AnalyzedAssets,
	GenerationOptions,
	GitHubAsset,
	GitHubRelease,
	GitHubRepository,
	ParsedGitHubUrl,
	PlatformAssets,
	PlatformConfig,
	ProtoPlugin,
	RuntimeInfo,
	TestOptions,
} from "./types.ts";

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
