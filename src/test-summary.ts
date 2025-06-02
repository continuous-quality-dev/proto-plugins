#!/usr/bin/env node --experimental-strip-types
/**
 * Test Summary Generator
 * Runs tests across all runtimes and generates a markdown table summary
 */

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import process from "node:process";

interface IndividualTest {
	name: string;
	duration: string;
	status: "pass" | "fail";
	type?: "unit" | "property";
	runs?: number; // For property-based tests
}

interface TestResult {
	runtime: string;
	passed: number;
	failed: number;
	duration: string;
	status: "✅ PASS" | "❌ FAIL";
	details: string;
	individualTests: IndividualTest[];
}

interface TestSummary {
	totalTests: number;
	results: TestResult[];
	timestamp: string;
}

function parseTestOutput(output: string): {
	passed: number;
	failed: number;
	duration: string;
	individualTests: IndividualTest[];
} {
	const individualTests: IndividualTest[] = [];

	// Try to parse as JSON first (if --reporter=json was used)
	try {
		const jsonOutput = JSON.parse(output);
		if (jsonOutput && jsonOutput.results) {
			// Handle JSON output format
			let totalPassed = 0;
			let totalFailed = 0;

			for (const result of jsonOutput.results) {
				if (result.tests) {
					for (const test of result.tests) {
						individualTests.push({
							name: test.name || test.description || "unnamed test",
							duration: test.duration ? `${test.duration}ms` : "unknown",
							status: test.status === "passed" || test.passed ? "pass" : "fail",
						});

						if (test.status === "passed" || test.passed) {
							totalPassed++;
						} else {
							totalFailed++;
						}
					}
				}
			}

			return {
				passed: totalPassed,
				failed: totalFailed,
				duration: jsonOutput.duration || "unknown",
				individualTests,
			};
		}
	} catch {
		// Fall back to text parsing if JSON parsing fails
	}

	// Fallback: Parse text output
	// Count individual test assertions that passed (✔ symbols)
	const passedAssertions = (output.match(/✔/g) || []).length;

	// Count failed test files from poku output
	const failMatch = output.match(/FAIL › (\d+)/);
	const failed = failMatch ? Number.parseInt(failMatch[1], 10) : 0;

	// Detect property-based tests from fast-check output
	const propertyTestMatches = output.match(/Property\s+(.+?)\s+ok/g) || [];
	const propertyTestFailures = output.match(/Property\s+(.+?)\s+failed/g) || [];

	// Try to extract duration with a more specific pattern
	const durationMatch = output.match(/Duration\s+›\s+([0-9.]+(?:ms|s))/);

	// Clean up duration
	let duration = durationMatch ? durationMatch[1].trim() : "unknown";

	// If we didn't get a clean duration, try to extract just the numeric part
	if (duration === "unknown") {
		const numericMatch = output.match(/(\d+(?:\.\d+)?(?:ms|s))/);
		duration = numericMatch ? numericMatch[1] : "unknown";
	}

	// Extract individual test names and durations from text output
	const testLines = output.split("\n");
	for (const line of testLines) {
		// Strip ANSI codes first, then match (using \u001b for Unicode escape)
		// eslint-disable-next-line no-control-regex
		const strippedLine = line.replace(/\u001b\[[0-9;]*m/g, "");

		// Match regular test output
		const testMatch = strippedLine.match(/● (.+?) › ([0-9.]+ms)/);
		if (testMatch) {
			individualTests.push({
				name: testMatch[1].trim(),
				duration: testMatch[2],
				status: "pass",
				type: "unit",
			});
		}

		// Match property-based test output
		const propertyMatch = strippedLine.match(/✔ (.+?) \((\d+) runs?\)/);
		if (propertyMatch) {
			individualTests.push({
				name: propertyMatch[1].trim(),
				duration: "unknown", // Property tests don't always show individual duration
				status: "pass",
				type: "property",
				runs: Number.parseInt(propertyMatch[2], 10),
			});
		}
	}

	// Add property test counts to overall counts
	const propertyPassed = propertyTestMatches.length;
	const propertyFailed = propertyTestFailures.length;

	return {
		passed: passedAssertions + propertyPassed,
		failed: failed + propertyFailed,
		duration,
		individualTests,
	};
}

function runTestForRuntime(runtime: string): TestResult {
	console.log(`🧪 Running tests for ${runtime}...`);

	try {
		const startTime = Date.now();
		const output = execSync(`npm run test:${runtime}`, {
			encoding: "utf8",
			stdio: "pipe",
			env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
		});
		const endTime = Date.now();

		const { passed, failed, duration, individualTests } =
			parseTestOutput(output);
		const actualDuration = `${endTime - startTime}ms`;

		return {
			runtime: runtime.charAt(0).toUpperCase() + runtime.slice(1),
			passed,
			failed,
			duration: duration !== "unknown" ? duration : actualDuration,
			status: failed === 0 ? "✅ PASS" : "❌ FAIL",
			details: failed === 0 ? "All tests passed" : `${failed} test(s) failed`,
			individualTests,
		};
	} catch (error: any) {
		console.error(`❌ Tests failed for ${runtime}:`, error.message);

		// Try to parse output from stderr if available
		const output = error.stdout || error.stderr || "";
		const { passed, failed, duration, individualTests } =
			parseTestOutput(output);

		return {
			runtime: runtime.charAt(0).toUpperCase() + runtime.slice(1),
			passed,
			failed: failed || 1, // At least 1 failure if we caught an error
			duration: duration !== "unknown" ? duration : "error",
			status: "❌ FAIL",
			details: error.message.split("\n")[0] || "Test execution failed",
			individualTests,
		};
	}
}

function generateMarkdownTable(summary: TestSummary): string {
	const { results, timestamp, totalTests } = summary;

	let markdown = `# Test Runtime Summary\n\n`;
	markdown += `**Generated:** ${timestamp}\n\n`;

	// Overall summary
	const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
	const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
	const allPassed = results.every((r) => r.status === "✅ PASS");

	markdown += `## 📊 Overall Results\n\n`;
	markdown += `- **Total Test Runs:** ${results.length} runtimes\n`;
	markdown += `- **Tests per Runtime:** ${totalTests}\n`;
	markdown += `- **Overall Status:** ${
		allPassed ? "✅ ALL PASS" : "❌ SOME FAILURES"
	}\n\n`;

	// Runtime comparison table
	markdown += `## 🏃 Runtime Performance Comparison\n\n`;
	markdown += `| Runtime | Status | Passed | Failed | Duration | Details |\n`;
	markdown += `|---------|--------|--------|--------|----------|----------|\n`;

	results.forEach((result) => {
		markdown += `| **${result.runtime}** | ${result.status} | ${result.passed} | ${result.failed} | \`${result.duration}\` | ${result.details} |\n`;
	});

	markdown += `\n`;

	// Performance insights
	markdown += `## ⚡ Performance Insights\n\n`;

	// Find fastest runtime
	const runtimesWithNumericDuration = results
		.map((r) => ({
			...r,
			numericDuration:
				Number.parseFloat(r.duration.replace(/[^\d.]/g, "")) ||
				Number.POSITIVE_INFINITY,
		}))
		.filter((r) => r.numericDuration !== Number.POSITIVE_INFINITY)
		.sort((a, b) => a.numericDuration - b.numericDuration);

	if (runtimesWithNumericDuration.length > 0) {
		const fastest = runtimesWithNumericDuration[0];
		const slowest =
			runtimesWithNumericDuration[runtimesWithNumericDuration.length - 1];

		markdown += `- **Fastest Runtime:** ${fastest.runtime} (${fastest.duration})\n`;
		markdown += `- **Slowest Runtime:** ${slowest.runtime} (${slowest.duration})\n`;

		if (runtimesWithNumericDuration.length > 1) {
			const speedup = (
				slowest.numericDuration / fastest.numericDuration
			).toFixed(1);
			markdown += `- **Speed Difference:** ${speedup}x faster\n`;
		}
	}

	markdown += `\n`;

	// Property-based test insights
	const propertyTests = results.flatMap((r) =>
		r.individualTests.filter((t) => t.type === "property"),
	);

	if (propertyTests.length > 0) {
		markdown += `## 🎲 Property-Based Test Insights\n\n`;

		const totalPropertyRuns = propertyTests.reduce(
			(sum, test) => sum + (test.runs || 0),
			0,
		);
		const avgRunsPerProperty = totalPropertyRuns / propertyTests.length;

		markdown += `- **Total Property Tests:** ${propertyTests.length}\n`;
		markdown += `- **Total Property Runs:** ${totalPropertyRuns}\n`;
		markdown += `- **Average Runs per Property:** ${avgRunsPerProperty.toFixed(1)}\n\n`;

		// Group by test name to show cross-runtime property test results
		const propertyTestMap = new Map<
			string,
			Array<{ runtime: string; runs: number }>
		>();

		for (const result of results) {
			for (const test of result.individualTests) {
				if (test.type === "property" && test.runs) {
					if (!propertyTestMap.has(test.name)) {
						propertyTestMap.set(test.name, []);
					}
					propertyTestMap.get(test.name)?.push({
						runtime: result.runtime,
						runs: test.runs,
					});
				}
			}
		}

		if (propertyTestMap.size > 0) {
			markdown += `### Property Test Coverage by Runtime\n\n`;
			markdown += `| Property Test | ${results.map((r) => r.runtime).join(" | ")} |\n`;
			markdown += `|---------------|${results.map(() => "----------").join("|")}|\n`;

			for (const [testName, runtimeData] of propertyTestMap) {
				const runtimeCols = results
					.map((result) => {
						const data = runtimeData.find((d) => d.runtime === result.runtime);
						return data ? `${data.runs} runs` : "N/A";
					})
					.join(" | ");

				markdown += `| ${testName} | ${runtimeCols} |\n`;
			}

			markdown += `\n`;
		}
	}

	// Individual test details - cross-runtime comparison
	markdown += `## 📋 Individual Test Performance Comparison\n\n`;

	// Create a map of test names to runtime results
	const testMap = new Map<
		string,
		Map<string, { duration: string; status: string }>
	>();

	for (const result of results) {
		for (const test of result.individualTests) {
			if (!testMap.has(test.name)) {
				testMap.set(test.name, new Map());
			}
			testMap.get(test.name)!.set(result.runtime, {
				duration: test.duration,
				status: test.status,
			});
		}
	}

	if (testMap.size > 0) {
		// Create header with all runtimes
		const runtimeNames = results.map((r) => r.runtime);
		markdown += `| Test Name | ${runtimeNames.join(" | ")} |\n`;
		markdown += `|-----------|${runtimeNames.map(() => "----------").join("|")}|\n`;

		// Sort tests by name for consistent ordering
		const sortedTests = Array.from(testMap.keys()).sort();

		for (const testName of sortedTests) {
			const runtimeResults = testMap.get(testName)!;

			// Build combined duration + status columns
			const combinedCols = runtimeNames
				.map((runtime) => {
					const result = runtimeResults.get(runtime);
					if (!result) {
						return "N/A ❓";
					}
					const statusIcon = result.status === "pass" ? "✅" : "❌";
					return `\`${result.duration}\` ${statusIcon}`;
				})
				.join(" | ");

			markdown += `| ${testName} | ${combinedCols} |\n`;
		}

		markdown += `\n`;

		// Add performance insights for individual tests
		markdown += `### 🏆 Individual Test Performance Insights\n\n`;

		// Find fastest and slowest tests overall
		const testPerformance: Array<{
			name: string;
			avgDuration: number;
			fastest: string;
			slowest: string;
		}> = [];

		for (const testName of sortedTests) {
			const runtimeResults = testMap.get(testName)!;
			const durations: Array<{ runtime: string; ms: number }> = [];

			for (const runtime of runtimeNames) {
				const result = runtimeResults.get(runtime);
				if (result) {
					const ms = Number.parseFloat(result.duration.replace(/[^\d.]/g, ""));
					if (!Number.isNaN(ms)) {
						durations.push({ runtime, ms });
					}
				}
			}

			if (durations.length > 0) {
				durations.sort((a, b) => a.ms - b.ms);
				const avgDuration =
					durations.reduce((sum, d) => sum + d.ms, 0) / durations.length;

				testPerformance.push({
					name: testName,
					avgDuration,
					fastest: durations[0].runtime,
					slowest: durations[durations.length - 1].runtime,
				});
			}
		}

		// Sort by average duration and show top/bottom performers
		testPerformance.sort((a, b) => a.avgDuration - b.avgDuration);

		if (testPerformance.length > 0) {
			markdown += `**Fastest Tests (by average duration):**\n`;
			for (let i = 0; i < Math.min(3, testPerformance.length); i++) {
				const test = testPerformance[i];
				markdown += `- **${test.name}** (avg: ${test.avgDuration.toFixed(3)}ms) - fastest on ${test.fastest}\n`;
			}

			markdown += `\n**Slowest Tests (by average duration):**\n`;
			for (
				let i = Math.max(0, testPerformance.length - 3);
				i < testPerformance.length;
				i++
			) {
				const test = testPerformance[i];
				markdown += `- **${test.name}** (avg: ${test.avgDuration.toFixed(3)}ms) - fastest on ${test.fastest}\n`;
			}

			markdown += `\n`;
		}
	}

	// Test commands
	markdown += `## 🔧 Test Commands\n\n`;
	markdown += `To run tests individually:\n\n`;
	markdown += `\`\`\`bash\n`;
	markdown += `# Run all runtimes\n`;
	markdown += `npm run test\n\n`;
	markdown += `# Run specific runtime\n`;
	markdown += `npm run test:node\n`;
	markdown += `npm run test:bun\n`;
	markdown += `npm run test:deno\n\n`;
	markdown += `# Generate this summary\n`;
	markdown += `npm run test:summary\n`;
	markdown += `\`\`\`\n\n`;

	markdown += `---\n`;
	markdown += `*Generated by test-summary.ts*\n`;

	return markdown;
}

function main() {
	console.log("🚀 Starting cross-runtime test summary generation...\n");

	const runtimes = ["node", "bun", "deno"];
	const results: TestResult[] = [];

	// Run tests for each runtime
	for (const runtime of runtimes) {
		const result = runTestForRuntime(runtime);
		results.push(result);
		console.log(
			`${result.status} ${result.runtime}: ${result.passed} passed, ${result.failed} failed (${result.duration})\n`,
		);
	}

	// Determine total tests from the first successful run
	const totalTests = results.find((r) => r.passed > 0)?.passed || 0;

	const summary: TestSummary = {
		totalTests,
		results,
		timestamp:
			new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC",
	};

	// Generate markdown
	const markdown = generateMarkdownTable(summary);

	// Write to file
	const outputFile = "TEST_SUMMARY.md";
	writeFileSync(outputFile, markdown);

	console.log(`📝 Test summary written to ${outputFile}`);
	console.log(`\n📊 Summary:`);
	console.log(`- Total runtimes tested: ${results.length}`);
	console.log(`- Tests per runtime: ${totalTests}`);
	console.log(
		`- Overall status: ${
			results.every((r) => r.status === "✅ PASS")
				? "✅ ALL PASS"
				: "❌ SOME FAILURES"
		}`,
	);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
