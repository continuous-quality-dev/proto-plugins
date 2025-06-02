import { strict as assert } from "node:assert";

/**
 * Calculate complexity metrics based on function name patterns and context
 * (Extracted from dangerfile.js for testing)
 */
function calculateComplexityMetrics(
	funcName: string,
	fileName: string,
	_allFunctions: string[],
) {
	let cyclomatic = 1;
	let loc = 10;
	let params = 1;
	let complexity = "🟢 Low";
	let description = "Simple utility function";

	// Base complexity from function name patterns
	if (funcName === "main") {
		cyclomatic = 8;
		loc = 45;
		params = 0;
		complexity = "🔴 High";
		description = "Main entry point with multiple execution paths";
	} else if (funcName.includes("generate") && funcName.includes("Plugin")) {
		cyclomatic = 7;
		loc = 40;
		params = 3;
		complexity = "🔴 High";
		description = "Complex plugin generation logic";
	} else if (funcName.includes("analyze") || funcName.includes("process")) {
		cyclomatic = 6;
		loc = 35;
		params = 2;
		complexity = "🟡 Medium"; // Will be adjusted to High later based on cyclomatic >= 7 check
		description = "Data analysis with pattern matching";
	} else if (funcName.includes("install") && funcName.includes("Plugin")) {
		cyclomatic = 7;
		loc = 42;
		params = 2;
		complexity = "🔴 High";
		description = "Plugin installation with error handling";
	} else if (
		funcName.includes("interactive") ||
		funcName.includes("Selection")
	) {
		cyclomatic = 8;
		loc = 50;
		params = 1;
		complexity = "🔴 High";
		description = "Interactive UI with multiple user paths";
	} else if (funcName.includes("parse") && funcName.includes("Args")) {
		cyclomatic = 4;
		loc = 25;
		params = 1;
		complexity = "🟡 Medium";
		description = "Argument parsing with validation";
	} else if (funcName.includes("fetch") || funcName.includes("load")) {
		cyclomatic = 3;
		loc = 20;
		params = 2;
		complexity = "🟡 Medium";
		description = "Data fetching with error handling";
	} else if (funcName.includes("test") && funcName.includes("Tool")) {
		cyclomatic = 5;
		loc = 30;
		params = 3;
		complexity = "🟡 Medium";
		description = "Tool testing with validation";
	} else if (
		funcName.includes("show") ||
		funcName.includes("get") ||
		funcName.includes("has")
	) {
		cyclomatic = 1;
		loc = 8;
		params = 1;
		complexity = "🟢 Low";
		description = "Simple getter/display function";
	} else if (
		funcName.includes("create") ||
		funcName.includes("install") ||
		funcName.includes("check")
	) {
		cyclomatic = 4;
		loc = 25;
		params = 2;
		complexity = "🟡 Medium";
		description = "Operation function with validation";
	}

	// Adjust based on file context
	if (fileName.includes("test")) {
		cyclomatic += 1; // Test files tend to have more conditional logic
		description += " (test context)";
	} else if (fileName.includes("utils")) {
		cyclomatic = Math.max(1, cyclomatic - 1); // Utils tend to be simpler
		loc = Math.max(5, loc - 5);
	}

	// Adjust complexity level based on final cyclomatic complexity
	if (cyclomatic >= 7) {
		complexity = "🔴 High";
	} else if (cyclomatic >= 4) {
		complexity = "🟡 Medium";
	} else {
		complexity = "🟢 Low";
	}

	return { complexity, cyclomatic, loc, params, description };
}

// Test cases
console.log("🧪 Testing Complexity Metrics Calculation...\n");

// Test main function
const mainResult = calculateComplexityMetrics("main", "any-file", []);
assert.strictEqual(mainResult.complexity, "🔴 High");
assert.strictEqual(mainResult.cyclomatic, 8);
assert.strictEqual(mainResult.loc, 45);
assert.strictEqual(mainResult.params, 0);
console.log("✅ Main function test passed");

// Test main function in test context
const mainTestResult = calculateComplexityMetrics("main", "test-something", []);
assert.strictEqual(mainTestResult.complexity, "🔴 High");
assert.strictEqual(mainTestResult.cyclomatic, 9); // 8 + 1 for test context
assert.ok(mainTestResult.description.includes("(test context)"));
console.log("✅ Main function test context passed");

// Test plugin generation
const generateResult = calculateComplexityMetrics(
	"generateProtoPlugin",
	"generator",
	[],
);
assert.strictEqual(generateResult.complexity, "🔴 High");
assert.strictEqual(generateResult.cyclomatic, 7);
assert.strictEqual(generateResult.loc, 40);
assert.strictEqual(generateResult.params, 3);
console.log("✅ Generate plugin test passed");

// Test medium complexity
const parseResult = calculateComplexityMetrics("parseArgs", "cli", []);
assert.strictEqual(parseResult.complexity, "🟡 Medium");
assert.strictEqual(parseResult.cyclomatic, 4);
assert.strictEqual(parseResult.loc, 25);
assert.strictEqual(parseResult.params, 1);
console.log("✅ Parse args test passed");

// Test low complexity
const showResult = calculateComplexityMetrics("showHelp", "helper", []);
assert.strictEqual(showResult.complexity, "🟢 Low");
assert.strictEqual(showResult.cyclomatic, 1);
assert.strictEqual(showResult.loc, 8);
assert.strictEqual(showResult.params, 1);
console.log("✅ Show help test passed");

// Test utils context adjustment
const normalResult = calculateComplexityMetrics("parseArgs", "normal-file", []);
const utilsResult = calculateComplexityMetrics("parseArgs", "utils-file", []);
assert.ok(utilsResult.cyclomatic <= normalResult.cyclomatic);
assert.ok(utilsResult.cyclomatic >= 1);
assert.ok(utilsResult.loc <= normalResult.loc);
assert.ok(utilsResult.loc >= 5);
console.log("✅ Utils context adjustment test passed");

// Test complexity level boundaries
const highComplexityResult = calculateComplexityMetrics(
	"main",
	"test-file",
	[],
); // 8 + 1 = 9
assert.strictEqual(highComplexityResult.complexity, "🔴 High");

const mediumComplexityResult = calculateComplexityMetrics(
	"parseArgs",
	"normal-file",
	[],
); // 4
assert.strictEqual(mediumComplexityResult.complexity, "🟡 Medium");

const lowComplexityResult = calculateComplexityMetrics(
	"getFlag",
	"normal-file",
	[],
); // 1
assert.strictEqual(lowComplexityResult.complexity, "🟢 Low");
console.log("✅ Complexity level boundaries test passed");

// Test real-world examples
const realWorldTests = [
	{ name: "main", expected: "🔴 High" },
	{ name: "generateProtoPlugin", expected: "🔴 High" },
	{ name: "installPluginToProto", expected: "🔴 High" },
	{ name: "interactiveSelection", expected: "🔴 High" },
	{ name: "analyzeAssets", expected: "🟡 Medium" },
	{ name: "parseArgs", expected: "🟡 Medium" },
	{ name: "fetchGitHubRelease", expected: "🟢 Low" },
	{ name: "loadLocalPlugins", expected: "🟢 Low" },
	{ name: "testToolWithProto", expected: "🟡 Medium" },
	{ name: "createConfig", expected: "🟡 Medium" },
	{ name: "showHelp", expected: "🟢 Low" },
	{ name: "getVersion", expected: "🟢 Low" },
	{ name: "hasFlag", expected: "🟢 Low" },
];

for (const { name, expected } of realWorldTests) {
	const result = calculateComplexityMetrics(name, "normal-file", []);
	assert.strictEqual(
		result.complexity,
		expected,
		`Failed for function: ${name}`,
	);
}
console.log("✅ Real-world examples test passed");

// Test that all results have valid properties
const testResult = calculateComplexityMetrics("testFunction", "testFile", []);
assert.ok(testResult.complexity);
assert.ok(testResult.cyclomatic > 0);
assert.ok(testResult.loc > 0);
assert.ok(testResult.params >= 0);
assert.ok(testResult.description);
assert.ok(typeof testResult.description === "string");
console.log("✅ Valid properties test passed");

console.log("\n🎉 All complexity metrics tests passed!");
console.log("📊 Complexity calculation is working correctly!");
