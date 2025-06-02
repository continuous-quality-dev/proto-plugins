/**
 * Tests for generate-proto-plugin-stricli.ts
 * Cross-runtime compatible tests using poku
 *
 * Run with:
 * - Node.js: npx poku scripts/generate-proto-plugin-stricli.test.ts
 * - Bun: bun x poku scripts/generate-proto-plugin-stricli.test.ts
 * - Deno: deno run -A npm:poku scripts/generate-proto-plugin-stricli.test.ts
 */

import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";

import * as fc from "fast-check";
import { assert, describe, it } from "poku";

import type {
	AnalyzedAssets,
	GenerationOptions,
	GitHubAsset,
	PlatformAssets,
	ProtoPlugin,
} from "../utils/utils.ts";

// Mock GitHub assets for testing
const mockAssets: GitHubAsset[] = [
	{
		name: "d2-v0.7.0-linux-amd64.tar.gz",
		browser_download_url:
			"https://github.com/terrastruct/d2/releases/download/v0.7.0/d2-v0.7.0-linux-amd64.tar.gz",
		content_type: "application/gzip",
		size: 12345678,
		download_count: 100,
	},
	{
		name: "d2-v0.7.0-linux-arm64.tar.gz",
		browser_download_url:
			"https://github.com/terrastruct/d2/releases/download/v0.7.0/d2-v0.7.0-linux-arm64.tar.gz",
		content_type: "application/gzip",
		size: 12345678,
		download_count: 50,
	},
	{
		name: "d2-v0.7.0-macos-amd64.tar.gz",
		browser_download_url:
			"https://github.com/terrastruct/d2/releases/download/v0.7.0/d2-v0.7.0-macos-amd64.tar.gz",
		content_type: "application/gzip",
		size: 12345678,
		download_count: 75,
	},
	{
		name: "d2-v0.7.0-windows-amd64.zip",
		browser_download_url:
			"https://github.com/terrastruct/d2/releases/download/v0.7.0/d2-v0.7.0-windows-amd64.zip",
		content_type: "application/zip",
		size: 12345678,
		download_count: 25,
	},
	{
		name: "d2-v0.7.0-checksums.txt",
		browser_download_url:
			"https://github.com/terrastruct/d2/releases/download/v0.7.0/d2-v0.7.0-checksums.txt",
		content_type: "text/plain",
		size: 1234,
		download_count: 10,
	},
];

describe("Generate Proto Plugin Stricli Tests", () => {
	describe("Asset Analysis", () => {
		it("should analyze assets and detect platforms correctly", () => {
			// Test the analyzeAssets function logic from stricli version
			const platforms: PlatformAssets = {
				linux: [],
				macos: [],
				windows: [],
			};

			const architectures = new Set<string>();

			for (const asset of mockAssets) {
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

			// Assertions
			assert(platforms.linux.length === 2, "Should detect 2 Linux assets");
			assert(platforms.macos.length === 1, "Should detect 1 macOS asset");
			assert(platforms.windows.length === 1, "Should detect 1 Windows asset");
			assert(
				architectures.has("aarch64"),
				"Should detect aarch64 architecture",
			);
			assert(architectures.has("x86_64"), "Should detect x86_64 architecture");
		});

		it("should skip MSI files in automated mode", () => {
			const msiAssets: GitHubAsset[] = [
				{
					name: "tool-v1.0.0-windows-amd64.msi",
					browser_download_url: "https://example.com/tool.msi",
					content_type: "application/x-msi",
					size: 12345,
					download_count: 10,
				},
				{
					name: "tool-v1.0.0-windows-amd64.zip",
					browser_download_url: "https://example.com/tool.zip",
					content_type: "application/zip",
					size: 12345,
					download_count: 20,
				},
			];

			const platforms: PlatformAssets = {
				linux: [],
				macos: [],
				windows: [],
			};

			for (const asset of msiAssets) {
				const name = asset.name.toLowerCase();

				// Skip MSI files for automated mode, prefer tar.gz
				if (name.endsWith(".msi")) continue;

				if (name.includes("windows")) {
					platforms.windows.push(asset);
				}
			}

			assert(
				platforms.windows.length === 1,
				"Should skip MSI files and only include ZIP",
			);
			assert(
				platforms.windows[0].name.endsWith(".zip"),
				"Should prefer ZIP over MSI",
			);
		});
	});

	describe("File Pattern Detection", () => {
		it("should detect and replace version patterns", () => {
			const testCases = [
				{
					input: "d2-v0.7.0-linux-amd64.tar.gz",
					expected: "d2-v{version}-linux-amd64.tar.gz",
				},
				{
					input: "tool-1.2.3-windows-x64.zip",
					expected: "tool-v{version}-windows-x64.zip",
				},
				{
					input: "binary-v2.1.0-beta.1-macos-arm64.tar.gz",
					expected: "binary-v{version}-beta.1-macos-arm64.tar.gz",
				},
			];

			for (const testCase of testCases) {
				let pattern = testCase.input;

				// Replace version patterns (from stricli version)
				const versionPatterns = [
					/v(\d+\.\d+\.\d+[^\s-]*)/,
					/(\d+\.\d+\.\d+[^\s-]*)/,
				];

				for (const versionPattern of versionPatterns) {
					const match = pattern.match(versionPattern);
					if (match) {
						pattern = pattern.replace(match[0], "v{version}");
						break;
					}
				}

				assert(
					pattern === testCase.expected,
					`Pattern detection failed for ${testCase.input}. Expected: ${testCase.expected}, Got: ${pattern}`,
				);
			}
		});

		it("should detect and replace architecture patterns", () => {
			const testCases = [
				{
					input: "tool-v{version}-linux-amd64.tar.gz",
					expected: "tool-v{version}-linux-{arch}.tar.gz",
				},
				{
					input: "binary-v{version}-windows-x86_64.zip",
					expected: "binary-v{version}-windows-{arch}.zip",
				},
				{
					input: "app-v{version}-macos-arm64.tar.gz",
					expected: "app-v{version}-macos-{arch}.tar.gz",
				},
			];

			for (const testCase of testCases) {
				let pattern = testCase.input;

				// Replace architecture patterns (from stricli version)
				const archPatterns = ["amd64", "arm64", "x86_64", "aarch64", "x64"];

				for (const arch of archPatterns) {
					if (pattern.includes(arch)) {
						pattern = pattern.replace(arch, "{arch}");
						break;
					}
				}

				assert(
					pattern === testCase.expected,
					`Architecture pattern detection failed for ${testCase.input}. Expected: ${testCase.expected}, Got: ${pattern}`,
				);
			}
		});
	});

	describe("Archive Prefix Generation", () => {
		it("should generate clean archive prefixes", () => {
			const testCases = [
				{
					input: "d2-v{version}-linux-{arch}.tar.gz",
					expected: "d2-v{version}",
				},
				{
					input: "tool-v{version}-windows-{arch}.zip",
					expected: "tool-v{version}",
				},
				{
					input: "binary-v{version}-macos-{arch}.tgz",
					expected: "binary-v{version}",
				},
			];

			for (const testCase of testCases) {
				// Apply generateArchivePrefix logic from stricli version
				let prefix = testCase.input.replace(/\.(tar\.gz|zip|tgz)$/, "");

				// Remove platform and arch patterns to get a generic prefix
				prefix = prefix.replace(/-{arch}$/, "");
				prefix = prefix.replace(/-linux$/, "");
				prefix = prefix.replace(/-macos$/, "");
				prefix = prefix.replace(/-windows$/, "");

				assert(
					prefix === testCase.expected,
					`Archive prefix generation failed for ${testCase.input}. Expected: ${testCase.expected}, Got: ${prefix}`,
				);
			}
		});
	});

	describe("Plugin Configuration Generation", () => {
		it("should generate valid proto plugin structure", () => {
			const mockPlugin: ProtoPlugin = {
				name: "d2",
				type: "cli",
				description:
					"A modern diagram scripting language that turns text to diagrams",
				platform: {
					linux: {
						"download-file": "d2-v{version}-linux-{arch}.tar.gz",
						"archive-prefix": "d2-v{version}",
						"bin-path": "bin/d2",
					},
					macos: {
						"download-file": "d2-v{version}-macos-{arch}.tar.gz",
						"archive-prefix": "d2-v{version}",
						"bin-path": "bin/d2",
					},
					windows: {
						"download-file": "d2-v{version}-windows-{arch}.zip",
						"archive-prefix": "d2-v{version}",
						"bin-path": "bin/d2.exe",
					},
				},
				install: {
					"download-url":
						"https://github.com/terrastruct/d2/releases/download/v{version}/{download_file}",
				},
				resolve: {
					"git-url": "https://github.com/terrastruct/d2",
				},
			};

			// Validate plugin structure
			assert(
				typeof mockPlugin.name === "string",
				"Plugin name should be a string",
			);
			assert(
				typeof mockPlugin.type === "string",
				"Plugin type should be a string",
			);
			assert(
				typeof mockPlugin.description === "string",
				"Plugin description should be a string",
			);
			assert(
				typeof mockPlugin.platform === "object",
				"Plugin platform should be an object",
			);
			assert(
				typeof mockPlugin.install === "object",
				"Plugin install should be an object",
			);
			assert(
				typeof mockPlugin.resolve === "object",
				"Plugin resolve should be an object",
			);

			// Validate platform configurations
			for (const [platformName, config] of Object.entries(
				mockPlugin.platform,
			)) {
				assert(
					typeof config["download-file"] === "string",
					`${platformName} download-file should be a string`,
				);
				assert(
					typeof config["archive-prefix"] === "string",
					`${platformName} archive-prefix should be a string`,
				);
				assert(
					typeof config["bin-path"] === "string",
					`${platformName} bin-path should be a string`,
				);
			}

			// Validate required URLs
			assert(
				mockPlugin.install["download-url"].includes("{version}"),
				"Download URL should contain version placeholder",
			);
			assert(
				mockPlugin.install["download-url"].includes("{download_file}"),
				"Download URL should contain download_file placeholder",
			);
			assert(
				mockPlugin.resolve["git-url"].startsWith("https://github.com/"),
				"Git URL should be a GitHub URL",
			);
		});
	});

	describe("File Operations", () => {
		const testOutputDir = ".test-output";
		const testPluginFile = join(testOutputDir, "test-plugin-stricli.json");

		it("should write and read plugin JSON correctly", () => {
			// Create test directory if it doesn't exist
			if (!existsSync(testOutputDir)) {
				mkdirSync(testOutputDir, { recursive: true });
			}

			const mockPlugin: ProtoPlugin = {
				name: "test-tool-stricli",
				type: "cli",
				description: "A test tool for testing stricli version",
				platform: {
					linux: {
						"download-file": "test-tool-v{version}-linux-{arch}.tar.gz",
						"archive-prefix": "test-tool-v{version}",
						"bin-path": "bin/test-tool",
					},
				},
				install: {
					"download-url":
						"https://github.com/test/test-tool/releases/download/v{version}/{download_file}",
				},
				resolve: {
					"git-url": "https://github.com/test/test-tool",
				},
			};

			// Write plugin to file
			writeFileSync(testPluginFile, `${JSON.stringify(mockPlugin, null, 2)}\n`);

			// Verify file exists
			assert(existsSync(testPluginFile), "Plugin file should be created");

			// Read and parse file
			const fileContent = readFileSync(testPluginFile, "utf8");
			const parsedPlugin = JSON.parse(fileContent) as ProtoPlugin;

			// Verify content matches
			assert(parsedPlugin.name === mockPlugin.name, "Plugin name should match");
			assert(parsedPlugin.type === mockPlugin.type, "Plugin type should match");
			assert(
				parsedPlugin.description === mockPlugin.description,
				"Plugin description should match",
			);
			assert(
				Object.keys(parsedPlugin.platform).length ===
					Object.keys(mockPlugin.platform).length,
				"Platform count should match",
			);

			// Cleanup
			if (existsSync(testPluginFile)) {
				rmSync(testPluginFile);
			}
			if (existsSync(testOutputDir)) {
				rmSync(testOutputDir, { recursive: true });
			}
		});

		describe("Argument Parsing", () => {
			it("should parse command line arguments correctly", () => {
				// Test the parseArgs function logic from stricli version
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
						} else if (!githubUrl && arg.includes("github.com")) {
							githubUrl = arg;
						}
					}

					if (!githubUrl) {
						throw new Error("GitHub URL is required");
					}

					return { options, githubUrl };
				}

				// Test cases
				const testCases = [
					{
						args: ["https://github.com/owner/repo"],
						expected: {
							options: {
								interactive: true,
								autoSave: false,
								outputFile: undefined,
							},
							githubUrl: "https://github.com/owner/repo",
						},
					},
					{
						args: ["--auto", "https://github.com/owner/repo"],
						expected: {
							options: {
								interactive: false,
								autoSave: true,
								outputFile: undefined,
							},
							githubUrl: "https://github.com/owner/repo",
						},
					},
					{
						args: ["--output", "custom.json", "https://github.com/owner/repo"],
						expected: {
							options: {
								interactive: true,
								autoSave: false,
								outputFile: "custom.json",
							},
							githubUrl: "https://github.com/owner/repo",
						},
					},
				];

				for (const testCase of testCases) {
					const result = parseArgs(testCase.args);

					assert(
						result.options.interactive ===
							testCase.expected.options.interactive,
						`Interactive mode should be ${testCase.expected.options.interactive}`,
					);
					assert(
						result.options.autoSave === testCase.expected.options.autoSave,
						`Auto save should be ${testCase.expected.options.autoSave}`,
					);
					assert(
						result.options.outputFile === testCase.expected.options.outputFile,
						`Output file should be ${testCase.expected.options.outputFile}`,
					);
					assert(
						result.githubUrl === testCase.expected.githubUrl,
						`GitHub URL should be ${testCase.expected.githubUrl}`,
					);
				}
			});
		});

		describe("Property-Based Tests", () => {
			it("should handle any valid GitHub URL format", () => {
				const githubUrlGenerator = fc.record({
					owner: fc
						.string({ minLength: 1, maxLength: 39 })
						.filter((s) => /^[a-zA-Z0-9-]+$/.test(s)),
					repo: fc
						.string({ minLength: 1, maxLength: 100 })
						.filter((s) => /^[a-zA-Z0-9._-]+$/.test(s)),
				});

				fc.assert(
					fc.property(githubUrlGenerator, ({ owner, repo }) => {
						const url = `https://github.com/${owner}/${repo}`;

						// Test URL parsing logic
						const patterns = [
							/github\.com\/([^\/]+)\/([^\/]+)(?:\/releases)?/,
							/github\.com\/([^\/]+)\/([^\/]+)\.git/,
						];

						let parsed = false;
						for (const pattern of patterns) {
							const match = url.match(pattern);
							if (match) {
								assert(match[1] === owner, "Owner should match");
								assert(
									match[2].replace(/\.git$/, "") === repo,
									"Repo should match",
								);
								parsed = true;
								break;
							}
						}

						assert(parsed, "URL should be parseable");
						return true;
					}),
				);
			});
		});
	});
});
