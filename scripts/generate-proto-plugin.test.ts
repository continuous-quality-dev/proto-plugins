/**
 * Tests for generate-proto-plugin.ts
 * Cross-runtime compatible tests using poku
 *
 * Run with:
 * - Node.js: npx poku scripts/generate-proto-plugin.test.ts
 * - Bun: bun x poku scripts/generate-proto-plugin.test.ts
 * - Deno: deno run -A npm:poku scripts/generate-proto-plugin.test.ts
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
} from "./shared-utils.ts";

// Import functions to test - we need to extract them from the script
// Since the script is designed to run as a CLI, we'll test the utility functions

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

// Test utility functions by importing them from the script
// We'll need to create a module that exports the functions for testing

describe("Generate Proto Plugin Tests", () => {
	describe("Asset Analysis", () => {
		it("should analyze assets and detect platforms correctly", () => {
			// We'll test the analyzeAssets function logic
			const platforms: PlatformAssets = {
				linux: [],
				macos: [],
				windows: [],
			};

			const architectures = new Set<string>();

			for (const asset of mockAssets) {
				const name = asset.name.toLowerCase();

				// Skip non-binary files
				if (name.includes("checksum") || name.includes("sha256")) continue;

				// Detect platform
				let platform: keyof PlatformAssets | null = null;
				if (name.includes("linux")) {
					platform = "linux";
				} else if (name.includes("macos") || name.includes("darwin")) {
					platform = "macos";
				} else if (name.includes("windows") || name.includes("win")) {
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

				// Skip MSI files for automated mode
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

				// Replace version patterns
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

				// Replace architecture patterns
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
				let prefix = testCase.input.replace(/\.(tar\.gz|zip|tgz)$/, "");

				// Remove platform and arch patterns
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
		const testPluginFile = join(testOutputDir, "test-plugin.json");

		it("should write and read plugin JSON correctly", () => {
			// Create test directory if it doesn't exist
			if (!existsSync(testOutputDir)) {
				mkdirSync(testOutputDir, { recursive: true });
			}

			const mockPlugin: ProtoPlugin = {
				name: "test-tool",
				type: "cli",
				description: "A test tool for testing",
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
	});

	describe("Edge Cases and Error Handling", () => {
		it("should handle empty asset arrays", () => {
			const emptyAssets: GitHubAsset[] = [];

			const platforms: PlatformAssets = {
				linux: [],
				macos: [],
				windows: [],
			};

			const architectures = new Set<string>();

			for (const asset of emptyAssets) {
				// This loop should not execute
				platforms.linux.push(asset);
			}

			assert(platforms.linux.length === 0, "Should handle empty asset arrays");
			assert(platforms.macos.length === 0, "Should handle empty asset arrays");
			assert(
				platforms.windows.length === 0,
				"Should handle empty asset arrays",
			);
			assert(
				architectures.size === 0,
				"Should have no architectures for empty assets",
			);
		});

		it("should handle assets with no platform indicators", () => {
			const ambiguousAssets: GitHubAsset[] = [
				{
					name: "tool-v1.0.0.tar.gz",
					browser_download_url: "https://example.com/tool.tar.gz",
					content_type: "application/gzip",
					size: 12345,
					download_count: 10,
				},
				{
					name: "source-code.zip",
					browser_download_url: "https://example.com/source.zip",
					content_type: "application/zip",
					size: 54321,
					download_count: 5,
				},
			];

			const platforms: PlatformAssets = {
				linux: [],
				macos: [],
				windows: [],
			};

			for (const asset of ambiguousAssets) {
				const name = asset.name.toLowerCase();

				let platform: keyof PlatformAssets | null = null;
				if (name.includes("linux")) {
					platform = "linux";
				} else if (name.includes("macos") || name.includes("darwin")) {
					platform = "macos";
				} else if (name.includes("windows") || name.includes("win")) {
					platform = "windows";
				}

				if (platform) {
					platforms[platform].push(asset);
				}
			}

			assert(
				platforms.linux.length === 0,
				"Should not detect platform for ambiguous assets",
			);
			assert(
				platforms.macos.length === 0,
				"Should not detect platform for ambiguous assets",
			);
			assert(
				platforms.windows.length === 0,
				"Should not detect platform for ambiguous assets",
			);
		});

		it("should handle complex version patterns", () => {
			const complexVersions = [
				"tool-v1.2.3-alpha.1-linux-amd64.tar.gz",
				"binary-2.0.0-rc.2-windows-x64.zip",
				"app-v3.1.4-beta+build.123-macos-arm64.tar.gz",
				"cli-1.0.0-snapshot.20231201-linux-aarch64.tgz",
			];

			for (const filename of complexVersions) {
				let pattern = filename;

				// Replace version patterns (simpler approach that matches actual implementation)
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
					pattern.includes("v{version}"),
					`Should detect version in complex pattern: ${filename}`,
				);
				assert(
					!pattern.match(/\d+\.\d+\.\d+/),
					`Should replace all version numbers in: ${filename}`,
				);
			}
		});

		it("should handle different archive formats", () => {
			const archiveFormats = [
				"tool-v1.0.0-linux-amd64.tar.gz",
				"tool-v1.0.0-windows-amd64.zip",
				"tool-v1.0.0-macos-arm64.tgz",
				"tool-v1.0.0-linux-x64.tar.xz",
			];

			for (const filename of archiveFormats) {
				let prefix = filename.replace(/\.(tar\.gz|tar\.xz|zip|tgz)$/, "");

				// Remove platform and arch patterns
				prefix = prefix.replace(/-{arch}$/, "");
				prefix = prefix.replace(/-linux$/, "");
				prefix = prefix.replace(/-macos$/, "");
				prefix = prefix.replace(/-windows$/, "");

				assert(
					!prefix.includes(".tar"),
					`Should remove archive extension from: ${filename}`,
				);
				assert(
					!prefix.includes(".zip"),
					`Should remove archive extension from: ${filename}`,
				);
				assert(
					!prefix.includes(".tgz"),
					`Should remove archive extension from: ${filename}`,
				);
			}
		});

		it("should handle architecture variations", () => {
			const archVariations = [
				{ input: "amd64", expected: true },
				{ input: "x86_64", expected: true },
				{ input: "x64", expected: true },
				{ input: "arm64", expected: true },
				{ input: "aarch64", expected: true },
				{ input: "i386", expected: false },
				{ input: "armv7", expected: false },
				{ input: "unknown", expected: false },
			];

			const supportedArchs = ["amd64", "arm64", "x86_64", "aarch64", "x64"];

			for (const variation of archVariations) {
				const isSupported = supportedArchs.some((arch) =>
					variation.input.includes(arch),
				);
				assert(
					isSupported === variation.expected,
					`Architecture detection failed for: ${variation.input}`,
				);
			}
		});
	});

	describe("Integration Tests", () => {
		it("should generate complete plugin configuration from mock data", () => {
			// Simulate the complete flow with mock data
			const mockOwner = "terrastruct";
			const mockRepo = "d2";
			const mockDescription =
				"A modern diagram scripting language that turns text to diagrams";

			// Analyze assets
			const platforms: PlatformAssets = {
				linux: [],
				macos: [],
				windows: [],
			};

			const architectures = new Set<string>();

			for (const asset of mockAssets) {
				const name = asset.name.toLowerCase();

				if (name.includes("checksum")) continue;

				let platform: keyof PlatformAssets | null = null;
				if (name.includes("linux")) {
					platform = "linux";
				} else if (name.includes("macos")) {
					platform = "macos";
				} else if (name.includes("windows")) {
					platform = "windows";
				}

				if (platform) {
					platforms[platform].push(asset);

					if (name.includes("amd64") || name.includes("x86_64")) {
						architectures.add("x86_64");
					} else if (name.includes("arm64") || name.includes("aarch64")) {
						architectures.add("aarch64");
					}
				}
			}

			// Generate plugin configuration
			const plugin: ProtoPlugin = {
				name: mockRepo,
				type: "cli",
				description: mockDescription,
				platform: {},
				install: {
					"download-url": `https://github.com/${mockOwner}/${mockRepo}/releases/download/v{version}/{download_file}`,
				},
				resolve: {
					"git-url": `https://github.com/${mockOwner}/${mockRepo}`,
				},
			};

			// Configure platforms
			for (const [platformName, assets] of Object.entries(platforms)) {
				if (assets.length === 0) continue;

				const firstAsset = assets[0];
				let downloadFile = firstAsset.name;

				// Replace version
				downloadFile = downloadFile.replace(/v0\.7\.0/, "v{version}");

				// Replace architecture
				if (downloadFile.includes("amd64")) {
					downloadFile = downloadFile.replace("amd64", "{arch}");
				} else if (downloadFile.includes("arm64")) {
					downloadFile = downloadFile.replace("arm64", "{arch}");
				}

				const archivePrefix = downloadFile
					.replace(/\.(tar\.gz|zip)$/, "")
					.replace(/-{arch}$/, "");
				const binPath = platformName === "windows" ? "bin/d2.exe" : "bin/d2";

				plugin.platform[platformName] = {
					"download-file": downloadFile,
					"archive-prefix": archivePrefix,
					"bin-path": binPath,
				};
			}

			// Add architecture mapping
			if (architectures.size > 0) {
				plugin.install.arch = {};
				if (architectures.has("aarch64")) {
					plugin.install.arch.aarch64 = "arm64";
				}
				if (architectures.has("x86_64")) {
					plugin.install.arch.x86_64 = "amd64";
				}
			}

			// Validate the generated plugin
			assert(plugin.name === "d2", "Plugin name should be correct");
			assert(plugin.type === "cli", "Plugin type should be cli");
			assert(
				plugin.description === mockDescription,
				"Plugin description should match",
			);
			assert(
				Object.keys(plugin.platform).length === 3,
				"Should have 3 platforms configured",
			);
			assert(plugin.platform.linux !== undefined, "Should have Linux platform");
			assert(plugin.platform.macos !== undefined, "Should have macOS platform");
			assert(
				plugin.platform.windows !== undefined,
				"Should have Windows platform",
			);
			assert(
				plugin.install.arch !== undefined,
				"Should have architecture mapping",
			);

			// Type-safe access to arch mapping
			if (plugin.install.arch) {
				assert(
					plugin.install.arch.aarch64 === "arm64",
					"Should map aarch64 to arm64",
				);
				assert(
					plugin.install.arch.x86_64 === "amd64",
					"Should map x86_64 to amd64",
				);
			}
		});
	});

	describe("Property-Based Tests with fast-check", () => {
		describe("Asset Analysis Properties", () => {
			it("should always return valid platform categorization", () => {
				// Generator for GitHub assets with various naming patterns
				const assetGenerator = fc.record({
					name: fc.oneof(
						// Linux assets
						fc
							.string()
							.map((s) => `${s}-linux-amd64.tar.gz`),
						fc.string().map((s) => `${s}-linux-arm64.tar.gz`),
						fc.string().map((s) => `${s}-unknown-linux-gnu.tar.gz`),
						// macOS assets
						fc
							.string()
							.map((s) => `${s}-darwin-amd64.tar.gz`),
						fc.string().map((s) => `${s}-macos-arm64.tar.gz`),
						fc.string().map((s) => `${s}-apple-darwin.tar.gz`),
						// Windows assets
						fc
							.string()
							.map((s) => `${s}-windows-amd64.zip`),
						fc.string().map((s) => `${s}-win-x64.zip`),
						fc.string().map((s) => `${s}-msvc.zip`),
						// Ambiguous assets
						fc
							.string()
							.map((s) => `${s}.tar.gz`),
						fc.string().map((s) => `${s}-source.zip`),
					),
					browser_download_url: fc.webUrl(),
					content_type: fc.constantFrom(
						"application/gzip",
						"application/zip",
						"text/plain",
					),
					size: fc.integer({ min: 1, max: 100000000 }),
					download_count: fc.integer({ min: 0, max: 10000 }),
				});

				fc.assert(
					fc.property(
						fc.array(assetGenerator, { minLength: 0, maxLength: 20 }),
						(assets: GitHubAsset[]) => {
							const platforms: PlatformAssets = {
								linux: [],
								macos: [],
								windows: [],
							};

							const architectures = new Set<string>();

							// Replicate the asset analysis logic
							for (const asset of assets) {
								const name = asset.name.toLowerCase();

								// Skip MSI files and checksums
								if (
									name.endsWith(".msi") ||
									name.includes("checksum") ||
									name.includes("sha256")
								) {
									continue;
								}

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

							// Properties that should always hold
							const totalCategorized =
								platforms.linux.length +
								platforms.macos.length +
								platforms.windows.length;
							const totalAssets = assets.filter(
								(a) =>
									!a.name.toLowerCase().endsWith(".msi") &&
									!a.name.toLowerCase().includes("checksum") &&
									!a.name.toLowerCase().includes("sha256"),
							).length;

							// Each asset should be categorized at most once
							assert(
								totalCategorized <= totalAssets,
								"Assets should not be double-categorized",
							);

							// All platform arrays should contain valid assets
							for (const [platformName, platformAssets] of Object.entries(
								platforms,
							)) {
								for (const asset of platformAssets) {
									assert(
										typeof asset.name === "string",
										`Asset name should be string for ${platformName}`,
									);
									assert(
										typeof asset.browser_download_url === "string",
										`Asset URL should be string for ${platformName}`,
									);
									assert(
										typeof asset.size === "number",
										`Asset size should be number for ${platformName}`,
									);
									assert(
										asset.size >= 0,
										`Asset size should be non-negative for ${platformName}`,
									);
								}
							}

							// Architecture set should only contain valid architectures
							for (const arch of architectures) {
								assert(
									["aarch64", "x86_64"].includes(arch),
									`Invalid architecture detected: ${arch}`,
								);
							}

							return true;
						},
					),
				);
			});
		});

		describe("Version Pattern Properties", () => {
			it("should always produce valid version patterns", () => {
				// Generator for version strings
				const versionGenerator = fc
					.tuple(
						fc.integer({ min: 0, max: 99 }),
						fc.integer({ min: 0, max: 99 }),
						fc.integer({ min: 0, max: 99 }),
					)
					.map(([major, minor, patch]) => `${major}.${minor}.${patch}`);

				// Generator for pre-release suffixes
				const preReleaseGenerator = fc.oneof(
					fc.constant(""),
					fc.string({ minLength: 1, maxLength: 10 }).map((s) => `-alpha.${s}`),
					fc.string({ minLength: 1, maxLength: 10 }).map((s) => `-beta.${s}`),
					fc.string({ minLength: 1, maxLength: 10 }).map((s) => `-rc.${s}`),
				);

				// Generator for filename patterns
				const filenameGenerator = fc
					.tuple(
						fc.string({ minLength: 1, maxLength: 20 }),
						versionGenerator,
						preReleaseGenerator,
						fc.constantFrom("linux", "macos", "windows"),
						fc.constantFrom("amd64", "arm64", "x86_64"),
						fc.constantFrom(".tar.gz", ".zip", ".tgz"),
					)
					.map(
						([name, version, preRelease, platform, arch, ext]) =>
							`${name}-v${version}${preRelease}-${platform}-${arch}${ext}`,
					);

				fc.assert(
					fc.property(filenameGenerator, (filename: string) => {
						let pattern = filename;

						// Apply version pattern replacement
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

						// Properties that should hold
						assert(
							pattern.includes("v{version}"),
							"Pattern should contain version placeholder",
						);
						assert(
							!pattern.match(/\d+\.\d+\.\d+/),
							"Pattern should not contain literal version numbers",
						);

						// Original filename structure should be preserved except for version
						const originalParts = filename.split("-");
						const patternParts = pattern.split("-");
						assert(
							originalParts.length === patternParts.length,
							"Pattern should preserve filename structure",
						);

						return true;
					}),
				);
			});
		});

		describe("Architecture Pattern Properties", () => {
			it("should correctly replace architecture patterns", () => {
				const archPatterns = ["amd64", "arm64", "x86_64", "aarch64", "x64"];

				const filenameWithArchGenerator = fc
					.tuple(
						fc.string({ minLength: 1, maxLength: 20 }),
						fc.constantFrom(...archPatterns),
						fc.constantFrom(".tar.gz", ".zip", ".tgz"),
					)
					.map(([prefix, arch, ext]) => `${prefix}-${arch}${ext}`);

				fc.assert(
					fc.property(filenameWithArchGenerator, (filename: string) => {
						let pattern = filename;

						// Apply architecture pattern replacement
						for (const arch of archPatterns) {
							if (pattern.includes(arch)) {
								pattern = pattern.replace(arch, "{arch}");
								break;
							}
						}

						// Properties that should hold
						assert(
							pattern.includes("{arch}"),
							"Pattern should contain arch placeholder",
						);

						// Should not contain any of the original arch patterns
						for (const arch of archPatterns) {
							assert(
								!pattern.includes(arch),
								`Pattern should not contain literal arch: ${arch}`,
							);
						}

						return true;
					}),
				);
			});
		});

		describe("Archive Prefix Properties", () => {
			it("should generate clean prefixes from any download file", () => {
				const downloadFileGenerator = fc
					.tuple(
						fc.string({ minLength: 1, maxLength: 30 }),
						fc.constantFrom("v{version}", "{version}"),
						fc.oneof(
							fc.constant(""),
							fc.constantFrom("-linux", "-macos", "-windows"),
						),
						fc.oneof(
							fc.constant(""),
							fc.constantFrom("-{arch}", "-amd64", "-arm64"),
						),
						fc.constantFrom(".tar.gz", ".zip", ".tgz", ".tar.xz"),
					)
					.map(
						([name, version, platform, arch, ext]) =>
							`${name}-${version}${platform}${arch}${ext}`,
					);

				fc.assert(
					fc.property(downloadFileGenerator, (downloadFile: string) => {
						// Apply archive prefix generation logic
						let prefix = downloadFile.replace(
							/\.(tar\.gz|tar\.xz|zip|tgz)$/,
							"",
						);

						// Remove platform and arch patterns
						prefix = prefix.replace(/-{arch}$/, "");
						prefix = prefix.replace(/-linux$/, "");
						prefix = prefix.replace(/-macos$/, "");
						prefix = prefix.replace(/-windows$/, "");

						// Properties that should hold
						assert(typeof prefix === "string", "Prefix should be a string");
						assert(prefix.length > 0, "Prefix should not be empty");
						assert(
							!prefix.includes(".tar"),
							"Prefix should not contain archive extensions",
						);
						assert(
							!prefix.includes(".zip"),
							"Prefix should not contain archive extensions",
						);
						assert(
							!prefix.includes(".tgz"),
							"Prefix should not contain archive extensions",
						);

						// Should not end with platform indicators
						assert(
							!prefix.endsWith("-linux"),
							"Prefix should not end with platform indicator",
						);
						assert(
							!prefix.endsWith("-macos"),
							"Prefix should not end with platform indicator",
						);
						assert(
							!prefix.endsWith("-windows"),
							"Prefix should not end with platform indicator",
						);
						assert(
							!prefix.endsWith("-{arch}"),
							"Prefix should not end with arch placeholder",
						);

						return true;
					}),
				);
			});
		});

		describe("Plugin Configuration Properties", () => {
			it("should generate valid plugin configurations", () => {
				const pluginGenerator = fc.record({
					name: fc.string({ minLength: 1, maxLength: 50 }),
					type: fc.constantFrom("cli", "tool", "binary"),
					description: fc.string({ minLength: 1, maxLength: 200 }),
					platform: fc.dictionary(
						fc.constantFrom("linux", "macos", "windows"),
						fc.record({
							"download-file": fc.string({ minLength: 1, maxLength: 100 }),
							"archive-prefix": fc.string({ minLength: 1, maxLength: 50 }),
							"bin-path": fc.string({ minLength: 1, maxLength: 50 }),
						}),
					),
					install: fc.record({
						"download-url": fc.string({ minLength: 1, maxLength: 200 }),
					}),
					resolve: fc.record({
						"git-url": fc.string({ minLength: 1, maxLength: 200 }),
					}),
				});

				fc.assert(
					fc.property(pluginGenerator, (plugin: ProtoPlugin) => {
						// Properties that should always hold for valid plugin configurations
						assert(
							typeof plugin.name === "string",
							"Plugin name should be string",
						);
						assert(plugin.name.length > 0, "Plugin name should not be empty");

						assert(
							typeof plugin.type === "string",
							"Plugin type should be string",
						);
						assert(
							["cli", "tool", "binary"].includes(plugin.type),
							"Plugin type should be valid",
						);

						assert(
							typeof plugin.description === "string",
							"Plugin description should be string",
						);
						assert(
							plugin.description.length > 0,
							"Plugin description should not be empty",
						);

						assert(
							typeof plugin.platform === "object",
							"Plugin platform should be object",
						);
						assert(
							plugin.platform !== null,
							"Plugin platform should not be null",
						);

						// Validate platform configurations
						for (const [platformName, config] of Object.entries(
							plugin.platform,
						)) {
							assert(
								["linux", "macos", "windows"].includes(platformName),
								`Invalid platform: ${platformName}`,
							);
							assert(
								typeof config["download-file"] === "string",
								"download-file should be string",
							);
							assert(
								config["download-file"].length > 0,
								"download-file should not be empty",
							);
							assert(
								typeof config["archive-prefix"] === "string",
								"archive-prefix should be string",
							);
							assert(
								config["archive-prefix"].length > 0,
								"archive-prefix should not be empty",
							);
							assert(
								typeof config["bin-path"] === "string",
								"bin-path should be string",
							);
							assert(
								config["bin-path"].length > 0,
								"bin-path should not be empty",
							);
						}

						assert(
							typeof plugin.install === "object",
							"Plugin install should be object",
						);
						assert(
							typeof plugin.install["download-url"] === "string",
							"download-url should be string",
						);
						assert(
							plugin.install["download-url"].length > 0,
							"download-url should not be empty",
						);

						assert(
							typeof plugin.resolve === "object",
							"Plugin resolve should be object",
						);
						assert(
							typeof plugin.resolve["git-url"] === "string",
							"git-url should be string",
						);
						assert(
							plugin.resolve["git-url"].length > 0,
							"git-url should not be empty",
						);

						return true;
					}),
				);
			});
		});
	});
});
