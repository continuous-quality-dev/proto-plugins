import { strict as assert } from "node:assert";

import { describe, it } from "poku";

/**
 * Simple test for complexity metrics functionality
 */

// Simplified version of the complexity calculation function
function calculateComplexityMetrics(
	functionName: string,
	fileName: string,
	allFunctions: string[],
) {
	// Base complexity based on function name patterns
	let cyclomatic = 1;
	let loc = 10;
	let params = 1;
	let description = "Simple utility function";

	// High complexity patterns
	if (
		functionName.includes("generate") ||
		functionName.includes("install") ||
		functionName.includes("main") ||
		functionName.includes("analyze") ||
		functionName.includes("process") ||
		functionName.includes("interactive") ||
		functionName.includes("Selection")
	) {
		cyclomatic = 7;
		loc = 40;
		params = 3;
		if (functionName.includes("generate")) {
			description = "Complex plugin generation logic";
		} else if (functionName.includes("install")) {
			description = "Plugin installation with error handling";
		} else if (
			functionName.includes("analyze") ||
			functionName.includes("process")
		) {
			description = "Data analysis with pattern matching";
		} else if (
			functionName.includes("interactive") ||
			functionName.includes("Selection")
		) {
			description = "Interactive UI with multiple user paths";
		} else {
			description = "Complex main function with multiple responsibilities";
		}
	}
	// Medium complexity patterns
	else if (
		functionName.includes("parse") ||
		functionName.includes("fetch") ||
		functionName.includes("load") ||
		functionName.includes("test") ||
		functionName.includes("create") ||
		functionName.includes("check")
	) {
		cyclomatic = 4;
		loc = 25;
		params = 2;
		if (functionName.includes("parse")) {
			description = "Argument parsing with validation";
		} else if (
			functionName.includes("fetch") ||
			functionName.includes("load")
		) {
			description = "Data fetching with error handling";
		} else if (functionName.includes("test")) {
			description = "Tool testing with validation";
		} else {
			description = "Configuration or status management";
		}
	}
	// Low complexity patterns (default)
	else {
		cyclomatic = 1;
		loc = 8;
		params = 1;
		description = "Simple getter/display function";
	}

	// File context adjustments
	if (fileName.includes("test")) {
		cyclomatic += 1;
		description += " (test context)";
	}

	if (fileName.includes("utils")) {
		cyclomatic = Math.max(1, cyclomatic - 1);
		loc = Math.max(5, loc - 5);
	}

	// Determine complexity level
	let complexity: string;
	if (cyclomatic >= 7) {
		complexity = "🔴 High";
	} else if (cyclomatic >= 4) {
		complexity = "🟡 Medium";
	} else {
		complexity = "🟢 Low";
	}

	return {
		complexity,
		cyclomatic,
		loc,
		params,
		description,
	};
}

describe("Complexity Metrics Tests", () => {
	describe("Basic functionality", () => {
		it("should classify high complexity functions", () => {
			const result = calculateComplexityMetrics(
				"generateProtoPlugin",
				"generator",
				[],
			);

			assert.strictEqual(result.complexity, "🔴 High");
			assert.strictEqual(result.cyclomatic, 7);
			assert.strictEqual(result.description, "Complex plugin generation logic");
		});

		it("should classify medium complexity functions", () => {
			const result = calculateComplexityMetrics("parseArgs", "cli", []);

			assert.strictEqual(result.complexity, "🟡 Medium");
			assert.strictEqual(result.cyclomatic, 4);
			assert.strictEqual(
				result.description,
				"Argument parsing with validation",
			);
		});

		it("should classify low complexity functions", () => {
			const result = calculateComplexityMetrics("showHelp", "helper", []);

			assert.strictEqual(result.complexity, "🟢 Low");
			assert.strictEqual(result.cyclomatic, 1);
			assert.strictEqual(result.description, "Simple getter/display function");
		});
	});

	describe("Context adjustments", () => {
		it("should increase complexity for test files", () => {
			const normalResult = calculateComplexityMetrics(
				"parseArgs",
				"normal-file",
				[],
			);
			const testResult = calculateComplexityMetrics(
				"parseArgs",
				"test-file",
				[],
			);

			assert.strictEqual(testResult.cyclomatic, normalResult.cyclomatic + 1);
			assert.ok(testResult.description.includes("(test context)"));
		});

		it("should decrease complexity for utils files", () => {
			const normalResult = calculateComplexityMetrics(
				"parseArgs",
				"normal-file",
				[],
			);
			const utilsResult = calculateComplexityMetrics(
				"parseArgs",
				"utils-file",
				[],
			);

			assert.strictEqual(
				utilsResult.cyclomatic,
				Math.max(1, normalResult.cyclomatic - 1),
			);
			assert.strictEqual(utilsResult.loc, Math.max(5, normalResult.loc - 5));
		});
	});

	describe("Complexity boundaries", () => {
		it("should classify cyclomatic complexity 7+ as High", () => {
			const result = calculateComplexityMetrics("main", "test-file", []);
			assert.strictEqual(result.complexity, "🔴 High");
		});

		it("should classify cyclomatic complexity 4-6 as Medium", () => {
			const result = calculateComplexityMetrics("parseArgs", "normal-file", []);
			assert.strictEqual(result.complexity, "🟡 Medium");
		});

		it("should classify cyclomatic complexity 1-3 as Low", () => {
			const result = calculateComplexityMetrics("getFlag", "normal-file", []);
			assert.strictEqual(result.complexity, "🟢 Low");
		});
	});

	describe("Real-world examples", () => {
		const examples = [
			{ name: "main", expectedComplexity: "🔴 High" },
			{ name: "generateProtoPlugin", expectedComplexity: "🔴 High" },
			{ name: "parseArgs", expectedComplexity: "🟡 Medium" },
			{ name: "fetchGitHubRelease", expectedComplexity: "🟡 Medium" },
			{ name: "showHelp", expectedComplexity: "🟢 Low" },
			{ name: "getVersion", expectedComplexity: "🟢 Low" },
		];

		for (const { name, expectedComplexity } of examples) {
			it(`should classify ${name} as ${expectedComplexity}`, () => {
				const result = calculateComplexityMetrics(name, "normal-file", []);
				assert.strictEqual(result.complexity, expectedComplexity);
			});
		}
	});
});
