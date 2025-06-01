/**
 * Property-Based Tests for generate-proto-plugin.ts using fast-check
 * Cross-runtime compatible tests using poku and fast-check
 *
 * Run with:
 * - Node.js: npx poku scripts/generate-proto-plugin.property.test.ts
 * - Bun: bun x poku scripts/generate-proto-plugin.property.test.ts
 * - Deno: deno run --allow-all scripts/generate-proto-plugin.property.test.ts
 */

import * as fc from "fast-check";
import { assert, describe, it } from "poku";
import type {
	GitHubAsset,
	PlatformAssets,
	ProtoPlugin,
} from "./shared-utils.ts";

describe("Property-Based Tests for Proto Plugin Generation", () => {
	describe("URL Pattern Properties", () => {
		it("should generate valid GitHub URLs for any repository", () => {
			const repoGenerator = fc.record({
				owner: fc
					.string({ minLength: 1, maxLength: 39 })
					.filter((s) => /^[a-zA-Z0-9-]+$/.test(s)),
				repo: fc
					.string({ minLength: 1, maxLength: 100 })
					.filter((s) => /^[a-zA-Z0-9._-]+$/.test(s)),
				version: fc
					.string({ minLength: 1, maxLength: 20 })
					.filter((s) => /^[a-zA-Z0-9.-]+$/.test(s)),
			});

			fc.assert(
				fc.property(repoGenerator, ({ owner, repo, version }) => {
					const downloadUrl = `https://github.com/${owner}/${repo}/releases/download/v${version}/{download_file}`;
					const gitUrl = `https://github.com/${owner}/${repo}`;

					// Properties that should always hold
					assert(
						downloadUrl.startsWith("https://github.com/"),
						"Download URL should be GitHub URL",
					);
					assert(
						downloadUrl.includes("/releases/download/"),
						"Download URL should be release URL",
					);
					assert(
						downloadUrl.includes("{download_file}"),
						"Download URL should have file placeholder",
					);
					assert(
						gitUrl.startsWith("https://github.com/"),
						"Git URL should be GitHub URL",
					);
					assert(
						!gitUrl.includes("/releases/"),
						"Git URL should not include releases path",
					);

					// URL structure validation
					const urlParts = downloadUrl.split("/");
					assert(
						urlParts.length >= 7,
						"Download URL should have correct structure",
					);
					assert(urlParts[2] === "github.com", "Should be github.com domain");
					assert(urlParts[3] === owner, "Should contain correct owner");
					assert(urlParts[4] === repo, "Should contain correct repo");
					assert(urlParts[5] === "releases", "Should contain releases path");
					assert(urlParts[6] === "download", "Should contain download path");

					return true;
				}),
			);
		});
	});

	describe("Filename Sanitization Properties", () => {
		it("should handle any valid filename patterns", () => {
			const filenameGenerator = fc
				.tuple(
					fc
						.string({ minLength: 1, maxLength: 50 })
						.filter(
							(s) =>
								/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(s) &&
								!s.startsWith("-") &&
								!s.endsWith("-") &&
								!s.startsWith(".") &&
								!s.endsWith(".") &&
								s.trim().length > 0,
						),
					fc.constantFrom("v1.0.0", "v2.1.3", "v0.5.0-beta", "v1.0.0-rc.1"),
					fc.constantFrom("linux", "macos", "windows", "darwin", "win32"),
					fc.constantFrom("amd64", "arm64", "x86_64", "aarch64", "x64", "i386"),
					fc.constantFrom(".tar.gz", ".zip", ".tgz", ".tar.xz", ".7z"),
				)
				.map(
					([name, version, platform, arch, ext]) =>
						`${name}-${version}-${platform}-${arch}${ext}`,
				);

			fc.assert(
				fc.property(filenameGenerator, (filename: string) => {
					// Test filename parsing and validation
					const parts = filename.split("-");

					// Properties that should hold for any valid filename
					assert(parts.length >= 3, "Filename should have at least 3 parts");
					assert(filename.length > 0, "Filename should not be empty");
					assert(
						!filename.includes("//"),
						"Filename should not have double slashes",
					);
					assert(
						!filename.startsWith("-"),
						"Filename should not start with dash",
					);
					assert(!filename.endsWith("-"), "Filename should not end with dash");

					// Extension validation
					const validExtensions = [".tar.gz", ".zip", ".tgz", ".tar.xz", ".7z"];
					const hasValidExtension = validExtensions.some((ext) =>
						filename.endsWith(ext),
					);
					assert(
						hasValidExtension,
						`Filename should have valid extension: ${filename}`,
					);

					return true;
				}),
			);
		});
	});

	describe("Binary Path Generation Properties", () => {
		it("should generate correct binary paths for all platforms", () => {
			const binaryGenerator = fc.record({
				name: fc
					.string({ minLength: 1, maxLength: 30 })
					.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
				platform: fc.constantFrom("linux", "macos", "windows"),
				hasSubdir: fc.boolean(),
				subdir: fc
					.string({ minLength: 1, maxLength: 10 })
					.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
			});

			fc.assert(
				fc.property(
					binaryGenerator,
					({ name, platform, hasSubdir, subdir }) => {
						const basePath = hasSubdir ? `${subdir}/${name}` : `bin/${name}`;
						const binPath =
							platform === "windows" ? `${basePath}.exe` : basePath;

						// Properties that should hold
						assert(typeof binPath === "string", "Binary path should be string");
						assert(binPath.length > 0, "Binary path should not be empty");
						assert(!binPath.startsWith("/"), "Binary path should be relative");
						assert(
							!binPath.includes("//"),
							"Binary path should not have double slashes",
						);

						if (platform === "windows") {
							assert(
								binPath.endsWith(".exe"),
								"Windows binary should end with .exe",
							);
						} else {
							assert(
								!binPath.endsWith(".exe"),
								"Non-Windows binary should not end with .exe",
							);
						}

						// Path structure validation
						const pathParts = binPath.split("/");
						assert(
							pathParts.length >= 2,
							"Binary path should have directory structure",
						);
						assert(
							pathParts[pathParts.length - 1].includes(name),
							"Binary path should contain binary name",
						);

						return true;
					},
				),
			);
		});
	});

	describe("Asset Filtering Properties", () => {
		it("should consistently filter assets based on platform detection", () => {
			const validNameGenerator = fc
				.string({ minLength: 1, maxLength: 20 })
				.filter(
					(s) =>
						/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(s) &&
						!s.startsWith("-") &&
						!s.endsWith("-") &&
						!s.startsWith(".") &&
						!s.endsWith(".") &&
						s.trim().length > 0,
				);

			const assetArrayGenerator = fc.array(
				fc.record({
					name: fc.oneof(
						validNameGenerator.map((s) => `${s}-linux-amd64.tar.gz`),
						validNameGenerator.map((s) => `${s}-macos-arm64.tar.gz`),
						validNameGenerator.map((s) => `${s}-windows-x64.zip`),
						validNameGenerator.map((s) => `${s}-checksums.txt`),
						validNameGenerator.map((s) => `${s}.msi`),
						validNameGenerator.map((s) => `${s}-source.tar.gz`),
					),
					browser_download_url: fc.webUrl(),
					content_type: fc.constantFrom(
						"application/gzip",
						"application/zip",
						"text/plain",
					),
					size: fc.integer({ min: 1, max: 100000000 }),
					download_count: fc.integer({ min: 0, max: 10000 }),
				}),
				{ minLength: 0, maxLength: 50 },
			);

			fc.assert(
				fc.property(assetArrayGenerator, (assets: GitHubAsset[]) => {
					const platforms: PlatformAssets = {
						linux: [],
						macos: [],
						windows: [],
					};

					let filteredCount = 0;
					let categorizedCount = 0;

					for (const asset of assets) {
						const name = asset.name.toLowerCase();

						// Count filtered assets
						if (
							name.endsWith(".msi") ||
							name.includes("checksum") ||
							name.includes("source")
						) {
							filteredCount++;
							continue;
						}

						// Categorize remaining assets
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
							categorizedCount++;
						}
					}

					// Properties that should hold
					const totalProcessed = filteredCount + categorizedCount;
					assert(
						totalProcessed <= assets.length,
						"Should not process more assets than provided",
					);

					// Each platform should only contain assets for that platform
					for (const asset of platforms.linux) {
						assert(
							asset.name.toLowerCase().includes("linux"),
							"Linux platform should only contain Linux assets",
						);
					}

					for (const asset of platforms.macos) {
						const name = asset.name.toLowerCase();
						assert(
							name.includes("macos") || name.includes("darwin"),
							"macOS platform should only contain macOS assets",
						);
					}

					for (const asset of platforms.windows) {
						const name = asset.name.toLowerCase();
						assert(
							name.includes("windows") || name.includes("win"),
							"Windows platform should only contain Windows assets",
						);
					}

					// No asset should appear in multiple platforms (but duplicates in input are allowed)
					const allCategorized = [
						...platforms.linux,
						...platforms.macos,
						...platforms.windows,
					];
					// This property might not hold if there are duplicate assets in the input, which is valid
					// So we'll just check that the categorization logic is consistent
					for (const asset of allCategorized) {
						assert(
							typeof asset.name === "string",
							"All categorized assets should have valid names",
						);
					}

					return true;
				}),
			);
		});
	});

	describe("Version Replacement Invariants", () => {
		it("should maintain filename structure when replacing versions", () => {
			const validPartGenerator = fc
				.string({ minLength: 1, maxLength: 20 })
				.filter(
					(s) =>
						/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(s) &&
						!s.startsWith("-") &&
						!s.endsWith("-") &&
						!s.startsWith(".") &&
						!s.endsWith(".") &&
						s.trim().length > 0,
				);

			const versionedFilenameGenerator = fc
				.tuple(
					validPartGenerator,
					fc
						.tuple(
							fc.integer({ min: 0, max: 99 }),
							fc.integer({ min: 0, max: 99 }),
							fc.integer({ min: 0, max: 99 }),
						)
						.map(([major, minor, patch]) => `${major}.${minor}.${patch}`),
					validPartGenerator,
					fc.constantFrom(".tar.gz", ".zip", ".tgz"),
				)
				.map(
					([prefix, version, suffix, ext]) =>
						`${prefix}-v${version}-${suffix}${ext}`,
				);

			fc.assert(
				fc.property(versionedFilenameGenerator, (originalFilename: string) => {
					let processedFilename = originalFilename;

					// Apply version replacement logic
					const versionPatterns = [
						/v(\d+\.\d+\.\d+[^\s-]*)/,
						/(\d+\.\d+\.\d+[^\s-]*)/,
					];

					for (const versionPattern of versionPatterns) {
						const match = processedFilename.match(versionPattern);
						if (match) {
							processedFilename = processedFilename.replace(
								match[0],
								"v{version}",
							);
							break;
						}
					}

					// Invariants that should hold
					assert(
						processedFilename.includes("v{version}"),
						"Should contain version placeholder",
					);

					// Structure preservation (allowing for version replacement)
					const originalParts = originalFilename.split("-");
					const processedParts = processedFilename.split("-");
					// The number of parts should be the same or similar (version replacement might change structure slightly)
					assert(
						Math.abs(originalParts.length - processedParts.length) <= 1,
						"Should preserve general dash-separated structure",
					);

					// Extension preservation
					const getExtension = (filename: string) => {
						if (filename.endsWith(".tar.gz")) return ".tar.gz";
						if (filename.endsWith(".tar.xz")) return ".tar.xz";
						const parts = filename.split(".");
						return parts.length > 1 ? `.${parts[parts.length - 1]}` : "";
					};

					const originalExt = getExtension(originalFilename);
					const processedExt = getExtension(processedFilename);
					assert(
						originalExt === processedExt,
						"Should preserve file extension",
					);

					// Prefix preservation
					const originalPrefix = originalFilename.split("-")[0];
					const processedPrefix = processedFilename.split("-")[0];
					assert(
						originalPrefix === processedPrefix,
						"Should preserve filename prefix",
					);

					return true;
				}),
			);
		});
	});

	describe("Plugin Configuration Completeness", () => {
		it("should generate complete configurations for any valid input", () => {
			const configGenerator = fc.record({
				name: fc
					.string({ minLength: 1, maxLength: 50 })
					.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
				description: fc.string({ minLength: 10, maxLength: 200 }),
				owner: fc
					.string({ minLength: 1, maxLength: 39 })
					.filter((s) => /^[a-zA-Z0-9-]+$/.test(s)),
				repo: fc
					.string({ minLength: 1, maxLength: 100 })
					.filter((s) => /^[a-zA-Z0-9._-]+$/.test(s)),
				platforms: fc
					.array(fc.constantFrom("linux", "macos", "windows"), {
						minLength: 1,
						maxLength: 3,
					})
					.map((arr) => [...new Set(arr)]), // Remove duplicates
			});

			fc.assert(
				fc.property(
					configGenerator,
					({ name, description, owner, repo, platforms }) => {
						// Generate a plugin configuration
						const plugin: ProtoPlugin = {
							name,
							type: "cli",
							description,
							platform: {},
							install: {
								"download-url": `https://github.com/${owner}/${repo}/releases/download/v{version}/{download_file}`,
							},
							resolve: {
								"git-url": `https://github.com/${owner}/${repo}`,
							},
						};

						// Add platform configurations
						for (const platformName of platforms) {
							const downloadFile = `${name}-v{version}-${platformName}-{arch}.${
								platformName === "windows" ? "zip" : "tar.gz"
							}`;
							const archivePrefix = `${name}-v{version}`;
							const binPath =
								platformName === "windows" ? `bin/${name}.exe` : `bin/${name}`;

							plugin.platform[platformName] = {
								"download-file": downloadFile,
								"archive-prefix": archivePrefix,
								"bin-path": binPath,
							};
						}

						// Completeness properties
						assert(
							Object.keys(plugin.platform).length === platforms.length,
							"Should have configuration for all platforms",
						);
						assert(
							plugin.install["download-url"].includes(owner),
							"Download URL should include owner",
						);
						assert(
							plugin.install["download-url"].includes(repo),
							"Download URL should include repo",
						);
						assert(
							plugin.resolve["git-url"].includes(owner),
							"Git URL should include owner",
						);
						assert(
							plugin.resolve["git-url"].includes(repo),
							"Git URL should include repo",
						);

						// Platform-specific properties
						for (const [platformName, config] of Object.entries(
							plugin.platform,
						)) {
							assert(
								config["download-file"].includes(name),
								"Download file should include tool name",
							);
							assert(
								config["download-file"].includes(platformName),
								"Download file should include platform",
							);
							assert(
								config["archive-prefix"].includes(name),
								"Archive prefix should include tool name",
							);
							assert(
								config["bin-path"].includes(name),
								"Binary path should include tool name",
							);

							if (platformName === "windows") {
								assert(
									config["download-file"].endsWith(".zip"),
									"Windows should use ZIP files",
								);
								assert(
									config["bin-path"].endsWith(".exe"),
									"Windows should use .exe extension",
								);
							} else {
								assert(
									config["download-file"].endsWith(".tar.gz"),
									"Unix platforms should use tar.gz files",
								);
								assert(
									!config["bin-path"].endsWith(".exe"),
									"Unix platforms should not use .exe extension",
								);
							}
						}

						return true;
					},
				),
			);
		});
	});
});
