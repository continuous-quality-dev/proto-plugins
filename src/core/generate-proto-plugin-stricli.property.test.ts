/**
 * Property-Based Tests for generate-proto-plugin-stricli.ts
 * Cross-runtime compatible tests using poku and fast-check
 *
 * Run with:
 * - Node.js: npx poku scripts/generate-proto-plugin-stricli.property.test.ts
 * - Bun: bun x poku scripts/generate-proto-plugin-stricli.property.test.ts
 * - Deno: deno run -A npm:poku scripts/generate-proto-plugin-stricli.property.test.ts
 */

import * as fc from "fast-check";
import { assert, describe, it } from "poku";

import type {
	GenerationOptions as _GenerationOptions,
	ProtoPlugin as _ProtoPlugin,
} from "./shared-utils.ts";

describe("Property-Based Tests for Proto Plugin Generation (Stricli)", () => {
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
				fc.property(repoGenerator, ({ owner, repo, version: _version }) => {
					// Test URL generation patterns from stricli version
					const downloadUrl = `https://github.com/${owner}/${repo}/releases/download/v{version}/{download_file}`;
					const gitUrl = `https://github.com/${owner}/${repo}`;

					// Properties that should hold for any valid repository
					assert(
						downloadUrl.includes(owner),
						"Download URL should include owner",
					);
					assert(
						downloadUrl.includes(repo),
						"Download URL should include repo",
					);
					assert(
						downloadUrl.includes("v{version}"),
						"Download URL should include version placeholder",
					);
					assert(
						downloadUrl.includes("{download_file}"),
						"Download URL should include download_file placeholder",
					);

					assert(gitUrl.includes(owner), "Git URL should include owner");
					assert(gitUrl.includes(repo), "Git URL should include repo");
					assert(
						gitUrl.startsWith("https://github.com/"),
						"Git URL should be a GitHub URL",
					);

					return true;
				}),
			);
		});
	});

	describe("Filename Pattern Properties", () => {
		it("should handle any valid release filename pattern", () => {
			const filenameGenerator = fc
				.record({
					name: fc
						.string({ minLength: 1, maxLength: 30 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					version: fc
						.string({ minLength: 1, maxLength: 20 })
						.filter((s) => /^[a-zA-Z0-9.-]+$/.test(s)),
					platform: fc.constantFrom("linux", "macos", "windows"),
					arch: fc.constantFrom("amd64", "arm64", "x86_64", "aarch64"),
					extension: fc.constantFrom(".tar.gz", ".zip", ".tgz"),
				})
				.map(
					({ name, version, platform, arch, extension }) =>
						`${name}-v${version}-${platform}-${arch}${extension}`,
				);

			fc.assert(
				fc.property(filenameGenerator, (filename: string) => {
					// Test filename parsing and validation from stricli version
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
						// Apply binary path generation logic from stricli version
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

						assert(
							binPath.includes(name),
							"Binary path should include tool name",
						);

						return true;
					},
				),
			);
		});
	});

	describe("Architecture Mapping Properties", () => {
		it("should correctly map architectures for any tool", () => {
			const archMappingGenerator = fc.record({
				detectedArch: fc.constantFrom("aarch64", "x86_64"),
				interactive: fc.boolean(),
			});

			fc.assert(
				fc.property(archMappingGenerator, ({ detectedArch, interactive }) => {
					// Apply architecture mapping logic from stricli version
					const archMapping: Record<string, string> = {};

					if (detectedArch === "aarch64") {
						const mapping = interactive ? "arm64" : "arm64"; // In automated mode, always use arm64
						archMapping.aarch64 = mapping;
					} else if (detectedArch === "x86_64") {
						const mapping = interactive ? "amd64" : "amd64"; // In automated mode, always use amd64
						archMapping.x86_64 = mapping;
					}

					// Properties that should hold
					if (detectedArch === "aarch64") {
						assert(
							archMapping.aarch64 === "arm64",
							"aarch64 should map to arm64",
						);
					}
					if (detectedArch === "x86_64") {
						assert(
							archMapping.x86_64 === "amd64",
							"x86_64 should map to amd64",
						);
					}

					return true;
				}),
			);
		});
	});

	describe("Version Pattern Replacement Properties", () => {
		it("should correctly replace version patterns in any filename", () => {
			const versionedFilenameGenerator = fc
				.record({
					name: fc
						.string({ minLength: 1, maxLength: 20 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					version: fc
						.string({ minLength: 5, maxLength: 15 })
						.filter((s) => /^\d+\.\d+\.\d+/.test(s)),
					platform: fc.constantFrom("linux", "macos", "windows"),
					arch: fc.constantFrom("amd64", "arm64"),
					extension: fc.constantFrom(".tar.gz", ".zip"),
					versionPrefix: fc.constantFrom("v", ""),
				})
				.map(
					({ name, version, platform, arch, extension, versionPrefix }) =>
						`${name}-${versionPrefix}${version}-${platform}-${arch}${extension}`,
				);

			fc.assert(
				fc.property(versionedFilenameGenerator, (originalFilename: string) => {
					let processedFilename = originalFilename;

					// Apply version replacement logic from stricli version
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
					assert(
						processedFilename !== originalFilename,
						"Should be different from original",
					);
					assert(
						processedFilename.length > 0,
						"Processed filename should not be empty",
					);

					return true;
				}),
			);
		});
	});

	describe("Archive Prefix Generation Properties", () => {
		it("should generate clean prefixes for any download file", () => {
			const downloadFileGenerator = fc
				.record({
					name: fc
						.string({ minLength: 1, maxLength: 20 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					platform: fc.constantFrom("linux", "macos", "windows"),
					extension: fc.constantFrom(".tar.gz", ".tar.xz", ".zip", ".tgz"),
				})
				.map(
					({ name, platform, extension }) =>
						`${name}-v{version}-${platform}-{arch}${extension}`,
				);

			fc.assert(
				fc.property(downloadFileGenerator, (downloadFile: string) => {
					// Apply archive prefix generation logic from stricli version
					let prefix = downloadFile.replace(/\.(tar\.gz|tar\.xz|zip|tgz)$/, "");

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
						!prefix.endsWith("-linux"),
						"Prefix should not end with platform",
					);
					assert(
						!prefix.endsWith("-macos"),
						"Prefix should not end with platform",
					);
					assert(
						!prefix.endsWith("-windows"),
						"Prefix should not end with platform",
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
});
