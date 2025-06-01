/**
 * Property-Based Tests for shared-utils.ts using fast-check
 * Cross-runtime compatible tests using poku and fast-check
 *
 * Run with:
 * - Node.js: npx poku scripts/shared-utils.property.test.ts
 * - Bun: bun x poku scripts/shared-utils.property.test.ts
 * - Deno: deno run --allow-all npm:poku scripts/shared-utils.property.test.ts
 */

import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import * as fc from "fast-check";
import { assert, describe, it } from "poku";
import {
	detectRuntime,
	hasFlag,
	parseGitHubUrl,
	writeProtoPlugin,
} from "./shared-utils.ts";
import type { ProtoPlugin } from "./types.ts";

describe("Property-Based Tests for Shared Utils", () => {
	describe("parseGitHubUrl Properties", () => {
		it("should parse valid GitHub URLs consistently", () => {
			const validGitHubUrlGenerator = fc.record({
				owner: fc
					.string({ minLength: 1, maxLength: 39 })
					.filter(
						(s) =>
							/^[a-zA-Z0-9-]+$/.test(s) &&
							!s.startsWith("-") &&
							!s.endsWith("-"),
					),
				repo: fc
					.string({ minLength: 1, maxLength: 100 })
					.filter((s) => /^[a-zA-Z0-9._-]+$/.test(s)),
				suffix: fc.oneof(
					fc.constant(""),
					fc.constant("/releases"),
					fc.constant(".git"),
					fc.constant("/releases/latest"),
				),
			});

			fc.assert(
				fc.property(validGitHubUrlGenerator, ({ owner, repo, suffix }) => {
					const url = `https://github.com/${owner}/${repo}${suffix}`;
					const parsed = parseGitHubUrl(url);

					// Properties that should always hold
					assert(typeof parsed.owner === "string", "Owner should be string");
					assert(typeof parsed.repo === "string", "Repo should be string");
					assert(parsed.owner === owner, "Owner should match input");
					assert(
						parsed.repo === repo.replace(/\.git$/, ""),
						"Repo should match input (without .git)",
					);
					assert(parsed.owner.length > 0, "Owner should not be empty");
					assert(parsed.repo.length > 0, "Repo should not be empty");
				}),
				{ numRuns: 100 },
			);
		});

		it("should reject invalid GitHub URLs", () => {
			const invalidUrlGenerator = fc.oneof(
				fc.string().filter((s) => !s.includes("github.com")),
				fc.constant(""),
				fc.constant("not-a-url"),
				fc.constant("https://gitlab.com/owner/repo"),
				fc.constant("https://github.com/"),
				fc.constant("https://github.com/owner"),
			);

			fc.assert(
				fc.property(invalidUrlGenerator, (invalidUrl) => {
					let threwError = false;
					try {
						parseGitHubUrl(invalidUrl);
					} catch (error) {
						threwError = true;
						assert(error instanceof Error, "Should throw Error instance");
						assert(
							error.message.includes("Invalid GitHub URL format"),
							"Should have appropriate error message",
						);
					}
					assert(threwError, "Should throw error for invalid URL");
				}),
				{ numRuns: 50 },
			);
		});
	});

	describe("hasFlag Properties", () => {
		it("should correctly identify flags in argument arrays", () => {
			const flagGenerator = fc
				.string({ minLength: 1, maxLength: 20 })
				.filter((s) => /^[a-zA-Z0-9-_]+$/.test(s));

			const argsGenerator = fc.array(
				fc.string({ minLength: 1, maxLength: 30 }),
				{ minLength: 0, maxLength: 10 },
			);

			fc.assert(
				fc.property(flagGenerator, argsGenerator, (flag, args) => {
					// Test when flag is present
					const argsWithFlag = [...args, flag];
					const resultWithFlag = hasFlag(argsWithFlag, flag);
					assert(
						resultWithFlag === true,
						"Should return true when flag is present",
					);

					// Test when flag is not present
					const argsWithoutFlag = args.filter((arg) => arg !== flag);
					const resultWithoutFlag = hasFlag(argsWithoutFlag, flag);
					assert(
						resultWithoutFlag === false,
						"Should return false when flag is not present",
					);
				}),
				{ numRuns: 100 },
			);
		});

		it("should handle multiple flags correctly", () => {
			const flagsGenerator = fc.array(
				fc
					.string({ minLength: 1, maxLength: 20 })
					.filter((s) => /^[a-zA-Z0-9-_]+$/.test(s)),
				{ minLength: 1, maxLength: 5 },
			);

			const argsGenerator = fc.array(
				fc.string({ minLength: 1, maxLength: 30 }),
				{ minLength: 0, maxLength: 10 },
			);

			fc.assert(
				fc.property(flagsGenerator, argsGenerator, (flags, args) => {
					// Remove duplicates from flags
					const uniqueFlags = [...new Set(flags)];

					// Test when at least one flag is present
					if (uniqueFlags.length > 0) {
						const argsWithOneFlag = [...args, uniqueFlags[0]];
						const result = hasFlag(argsWithOneFlag, ...uniqueFlags);
						assert(
							result === true,
							"Should return true when at least one flag is present",
						);
					}

					// Test when no flags are present
					const argsWithoutFlags = args.filter(
						(arg) => !uniqueFlags.includes(arg),
					);
					const resultWithoutFlags = hasFlag(argsWithoutFlags, ...uniqueFlags);
					assert(
						resultWithoutFlags === false,
						"Should return false when no flags are present",
					);
				}),
				{ numRuns: 100 },
			);
		});
	});

	describe("detectRuntime Properties", () => {
		it("should always return a valid runtime info", () => {
			fc.assert(
				fc.property(fc.constant(null), () => {
					const runtime = detectRuntime();

					// Properties that should always hold
					assert(typeof runtime === "object", "Should return object");
					assert(typeof runtime.name === "string", "Name should be string");
					assert(
						typeof runtime.command === "string",
						"Command should be string",
					);
					assert(runtime.name.length > 0, "Name should not be empty");
					assert(runtime.command.length > 0, "Command should not be empty");

					// Should be one of the known runtimes
					const validRuntimes = ["Node.js", "Bun", "Deno"];
					assert(
						validRuntimes.includes(runtime.name),
						`Runtime name should be one of: ${validRuntimes.join(", ")}`,
					);

					// Command should match the runtime
					if (runtime.name === "Node.js") {
						assert(
							runtime.command.includes("node"),
							"Node.js command should include 'node'",
						);
					} else if (runtime.name === "Bun") {
						assert(
							runtime.command.includes("bun"),
							"Bun command should include 'bun'",
						);
					} else if (runtime.name === "Deno") {
						assert(
							runtime.command.includes("deno"),
							"Deno command should include 'deno'",
						);
					}
				}),
				{ numRuns: 10 }, // Low runs since this is environment-dependent
			);
		});
	});

	describe("writeProtoPlugin Properties", () => {
		it("should write and read back identical plugin data", () => {
			const platformConfigGenerator = fc.record({
				"download-file": fc.string({ minLength: 1, maxLength: 100 }),
				"archive-prefix": fc.string({ minLength: 0, maxLength: 50 }),
				"bin-path": fc.string({ minLength: 1, maxLength: 100 }),
				"checksum-file": fc.option(
					fc.string({ minLength: 1, maxLength: 100 }),
					{ nil: undefined },
				),
			});

			const protoPluginGenerator = fc.record({
				name: fc
					.string({ minLength: 1, maxLength: 50 })
					.filter((s) => /^[a-zA-Z0-9-_]+$/.test(s)),
				type: fc.constant("cli"),
				description: fc.string({ minLength: 1, maxLength: 200 }),
				platform: fc.record({
					"linux-x64": platformConfigGenerator,
					"macos-x64": platformConfigGenerator,
					"windows-x64": platformConfigGenerator,
				}),
				install: fc.record({
					"download-url": fc.string({ minLength: 1, maxLength: 200 }),
					arch: fc.option(
						fc.record({
							x64: fc.string({ minLength: 1, maxLength: 50 }),
							arm64: fc.string({ minLength: 1, maxLength: 50 }),
						}),
						{ nil: undefined },
					),
				}),
				resolve: fc.record({
					"git-url": fc.string({ minLength: 1, maxLength: 200 }),
				}),
			});

			fc.assert(
				fc.property(protoPluginGenerator, (plugin: ProtoPlugin) => {
					const tempFile = join("temp-test-plugin.json");

					try {
						// Write the plugin
						writeProtoPlugin(tempFile, plugin);

						// Verify file exists
						assert(existsSync(tempFile), "File should exist after writing");

						// Read back and parse
						const fileContent = readFileSync(tempFile, "utf8");
						const parsedPlugin = JSON.parse(fileContent);

						// Properties that should hold
						assert(
							typeof parsedPlugin === "object",
							"Parsed content should be object",
						);
						assert(parsedPlugin.name === plugin.name, "Name should match");
						assert(parsedPlugin.type === plugin.type, "Type should match");
						assert(
							parsedPlugin.description === plugin.description,
							"Description should match",
						);
						assert(
							typeof parsedPlugin.platform === "object",
							"Platform should be object",
						);
						assert(
							typeof parsedPlugin.install === "object",
							"Install should be object",
						);
						assert(
							typeof parsedPlugin.resolve === "object",
							"Resolve should be object",
						);

						// Verify JSON formatting (should end with newline)
						assert(fileContent.endsWith("\n"), "File should end with newline");

						// Verify it's properly formatted JSON (indented)
						assert(fileContent.includes("  "), "File should be indented");
					} finally {
						// Cleanup
						if (existsSync(tempFile)) {
							rmSync(tempFile);
						}
					}
				}),
				{ numRuns: 50 },
			);
		});

		it("should handle file write errors gracefully", () => {
			const invalidPathGenerator = fc.oneof(
				fc.constant("/invalid/path/that/does/not/exist/file.json"),
				fc.constant(""),
				fc.constant("\0invalid"),
			);

			const simplePluginGenerator = fc.record({
				name: fc.constant("test"),
				type: fc.constant("cli"),
				description: fc.constant("test plugin"),
				platform: fc.constant({}),
				install: fc.constant({ "download-url": "test" }),
				resolve: fc.constant({ "git-url": "test" }),
			});

			fc.assert(
				fc.property(
					invalidPathGenerator,
					simplePluginGenerator,
					(invalidPath, plugin) => {
						let threwError = false;
						try {
							writeProtoPlugin(invalidPath, plugin as ProtoPlugin);
						} catch (error) {
							threwError = true;
							assert(error instanceof Error, "Should throw Error instance");
							if (error instanceof Error) {
								assert(
									error.message.includes("Failed to write plugin file"),
									"Should have appropriate error message",
								);
							}
						}
						assert(threwError, "Should throw error for invalid path");
					},
				),
				{ numRuns: 20 },
			);
		});
	});
});
