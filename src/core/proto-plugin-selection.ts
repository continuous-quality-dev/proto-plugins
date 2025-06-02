#!/usr/bin/env node --experimental-strip-types

/**
 * Proto Plugin Selection Tool
 *
 * Cross-runtime compatible tool for selecting and managing proto plugins from:
 * - Local plugins in this repository (preferred)
 * - Official proto registry
 * - Custom plugin sources
 *
 * Usage:
 *   # Interactive mode
 *   node --experimental-strip-types src/proto-plugin-selection.ts
 *   bun src/proto-plugin-selection.ts
 *   deno run -A src/proto-plugin-selection.ts
 *
 *   # Auto-install specific plugins
 *   node --experimental-strip-types src/proto-plugin-selection.ts --install d2,just,hurl
 *   bun src/proto-plugin-selection.ts --install d2,just,hurl
 *   deno run -A src/proto-plugin-selection.ts --install d2,just,hurl
 *
 *   # Install all local plugins
 *   node --experimental-strip-types src/proto-plugin-selection.ts --install-all-local
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { consola } from "consola";
import {
	type BaseProtoRegistryEntry,
	type CommandLineArgs,
	type LocalPlugin,
	type ProtoRegistryEntry,
	type ProtoToolsConfig,
	detectRuntime,
	execCommand,
	loadCurrentProtoTools,
	parseToml,
	simplePrompt,
} from "../utils/utils.ts";

// Repository configuration
const REPO_CONFIG = {
	owner: "continuous-quality-dev",
	repo: "proto-plugins",
	branch: "main",
} as const;

/**
 * Fetch available plugins from proto registry
 */
async function fetchProtoRegistry(): Promise<ProtoRegistryEntry[]> {
	try {
		consola.info("Fetching plugins from proto registry...");
		const result = await execCommand("proto plugin search '' --json");

		if (!result.success) {
			consola.warn("Failed to fetch proto registry:", result.stderr);
			return [];
		}

		return JSON.parse(result.stdout);
	} catch (error) {
		consola.error("Failed to fetch proto registry:", error);
		return [];
	}
}

/**
 * Load local plugins from the plugins directory
 */
async function loadLocalPlugins(): Promise<LocalPlugin[]> {
	try {
		const pluginFiles = await readdir("plugins");
		const jsonFiles = pluginFiles.filter((name) => name.endsWith(".json"));

		consola.info(`Found ${jsonFiles.length} local plugin files`);

		const plugins: LocalPlugin[] = [];

		for (const name of jsonFiles) {
			try {
				const path = join("plugins", name);
				const contents = readFileSync(path, "utf8");
				const parsedContents: Record<string, unknown> = JSON.parse(contents);
				const properName = name.split(".")[0];
				const { description } = parsedContents;

				plugins.push({
					path,
					description: (description as string) || "No description available",
					name: properName,
					locator: `https://raw.githubusercontent.com/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/${REPO_CONFIG.branch}/plugins/${name}`,
					author: "local",
				});
			} catch (error) {
				consola.warn(`Failed to parse plugin file ${name}:`, error);
			}
		}

		return plugins;
	} catch (error) {
		consola.error("Failed to load local plugins:", error);
		return [];
	}
}

/**
 * Parse command line arguments
 */
function parseArgs(): CommandLineArgs {
	const args = process.argv.slice(2);
	const result: CommandLineArgs = {
		interactive: true,
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === "--install" && args[i + 1]) {
			result.install = args[i + 1].split(",").map((s: string) => s.trim());
			result.interactive = false;
			i++; // Skip next argument
		} else if (arg === "--install-all-local") {
			result.installAllLocal = true;
			result.interactive = false;
		}
	}

	return result;
}

/**
 * Install plugins to .prototools file
 */
function installPlugins(pluginsToInstall: BaseProtoRegistryEntry[]): void {
	try {
		let content = "";

		if (existsSync(".prototools")) {
			content = readFileSync(".prototools", "utf8");
		}

		// Parse existing content
		const config = parseToml(content) as ProtoToolsConfig;
		if (!config.plugins) {
			config.plugins = {};
		}

		// Add new plugins
		for (const plugin of pluginsToInstall) {
			config.plugins[plugin.id] = plugin.locator;
		}

		// Generate new TOML content
		let newContent = "";

		// Add non-plugin sections first
		for (const [section, value] of Object.entries(config)) {
			if (section === "plugins") continue;

			if (typeof value === "object" && value !== null) {
				newContent += `[${section}]\n`;
				for (const [key, val] of Object.entries(
					value as Record<string, unknown>,
				)) {
					newContent += `${key} = "${val}"\n`;
				}
				newContent += "\n";
			} else {
				newContent += `${section} = "${value}"\n`;
			}
		}

		// Add plugins section
		if (config.plugins && Object.keys(config.plugins).length > 0) {
			newContent += "[plugins]\n";
			for (const [key, value] of Object.entries(config.plugins)) {
				newContent += `${key} = "${value}"\n`;
			}
		}

		writeFileSync(".prototools", newContent);
		consola.success("Updated .prototools file");
	} catch (error) {
		consola.error("Failed to update .prototools:", error);
	}
}

/**
 * Interactive plugin selection
 */
async function interactiveSelection(
	plugins: BaseProtoRegistryEntry[],
	currentTools: string[],
): Promise<BaseProtoRegistryEntry[]> {
	consola.info("\n🎯 Available plugins:");

	// Sort plugins to show local ones first
	const sortedPlugins = plugins.sort((a, b) => {
		if (a.author === "local" && b.author !== "local") return -1;
		if (a.author !== "local" && b.author === "local") return 1;
		return a.id.localeCompare(b.id);
	});

	for (let i = 0; i < sortedPlugins.length; i++) {
		const plugin = sortedPlugins[i];
		const isInstalled =
			currentTools.includes(plugin.locator) ||
			currentTools.includes(`file://./plugins/${plugin.id}.json`);
		const status = isInstalled ? "✅" : "  ";
		const author =
			plugin.author === "local" ? "🏠 local" : `📦 ${plugin.author}`;

		consola.log(
			`${status} ${(i + 1).toString().padStart(3)}: ${plugin.id.padEnd(20)} (${author})`,
		);
	}

	consola.info(
		"\nEnter plugin numbers to install (comma-separated), 'all-local' for all local plugins, or 'quit' to exit:",
	);
	const input = await simplePrompt("Selection: ");

	if (input.toLowerCase() === "quit") {
		return [];
	}

	if (input.toLowerCase() === "all-local") {
		return sortedPlugins.filter((p) => p.author === "local");
	}

	const indices = input
		.split(",")
		.map((s: string) => Number.parseInt(s.trim()) - 1)
		.filter((i: number) => i >= 0 && i < sortedPlugins.length);

	return indices.map((i) => sortedPlugins[i]);
}

// Main execution
async function main(): Promise<void> {
	const args = parseArgs();
	const runtime = detectRuntime();

	consola.info(`🚀 Running on ${runtime.name}`);
	consola.info("🔍 Loading proto plugins...");

	const [protoRegistry, localPlugins, currentTools] = await Promise.all([
		fetchProtoRegistry(),
		loadLocalPlugins(),
		Promise.resolve(loadCurrentProtoTools()),
	]);

	// Combine all plugins, prioritizing local ones
	const plugins: BaseProtoRegistryEntry[] = [
		// Local plugins first (preferred)
		...localPlugins.map(({ name, locator, author, description }) => ({
			id: name,
			locator,
			author,
			description,
		})),
		// Official registry plugins
		...protoRegistry.map(({ id, locator, description, author }) => ({
			id,
			locator,
			author,
			description,
		})),
	];

	consola.success(
		`📦 Found ${plugins.length} total plugins (${localPlugins.length} local, ${protoRegistry.length} from registry)`,
	);

	let pluginsToInstall: BaseProtoRegistryEntry[] = [];

	if (args.installAllLocal) {
		pluginsToInstall = plugins.filter((p) => p.author === "local");
		consola.info(`Installing all ${pluginsToInstall.length} local plugins`);
	} else if (args.install && args.install.length > 0) {
		pluginsToInstall = plugins.filter((p) => args.install?.includes(p.id));
		consola.info(`Installing specified plugins: ${args.install.join(", ")}`);
	} else if (args.interactive) {
		pluginsToInstall = await interactiveSelection(plugins, currentTools);
	}

	if (pluginsToInstall.length > 0) {
		consola.info("\n✅ Selected plugins:");
		for (const plugin of pluginsToInstall) {
			consola.log(`  - ${plugin.id}: ${plugin.locator}`);
		}

		installPlugins(pluginsToInstall);

		consola.info("\n💡 To apply changes, run:");
		consola.log("proto install");
	} else {
		consola.warn("❌ No plugins selected");
	}
}

// Run main function
main().catch((error) => {
	consola.error("Fatal error:", error);
	process.exit(1);
});
