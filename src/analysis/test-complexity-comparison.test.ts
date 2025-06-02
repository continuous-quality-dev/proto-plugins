#!/usr/bin/env node
/**
 * TypeScript test for complexity comparison functionality
 * Tests the calculateMetricsDiff and generateComparisonMarkdown functions
 */

import { strict as assert } from "node:assert";
import process from "node:process";
import type {
	MetricsDiff,
	MockComplexityMetrics,
	TestFunction,
	TestRunner,
} from "../types/complexity-types.ts";

// Import the functions to test from the TypeScript implementation
import {
	calculateMetricsDiff,
	generateComparisonMarkdown,
} from "./generate-complexity-comparison.ts";

// ============================================================================
// Mock Test Data
// ============================================================================

const mockBaseMetrics: MockComplexityMetrics = {
	metadata: {
		totalFiles: 5,
		totalFunctions: 50,
	},
	projectMetrics: {
		averageCyclomaticComplexity: "3.50",
		complexityDistribution: {
			high: 5,
			medium: 15,
			low: 30,
		},
	},
	files: {
		utils: {
			functionCount: 20,
			metrics: {
				averageCyclomaticComplexity: "2.50",
				highComplexityFunctions: 2,
			},
		},
		generator: {
			functionCount: 15,
			metrics: {
				averageCyclomaticComplexity: "4.20",
				highComplexityFunctions: 3,
			},
		},
	},
};

const mockCurrentMetrics: MockComplexityMetrics = {
	metadata: {
		totalFiles: 6,
		totalFunctions: 55,
	},
	projectMetrics: {
		averageCyclomaticComplexity: "3.75",
		complexityDistribution: {
			high: 6,
			medium: 16,
			low: 33,
		},
	},
	files: {
		utils: {
			functionCount: 22,
			metrics: {
				averageCyclomaticComplexity: "2.30",
				highComplexityFunctions: 1,
			},
		},
		generator: {
			functionCount: 15,
			metrics: {
				averageCyclomaticComplexity: "4.50",
				highComplexityFunctions: 4,
			},
		},
		"new-module": {
			functionCount: 8,
			metrics: {
				averageCyclomaticComplexity: "3.00",
				highComplexityFunctions: 1,
			},
		},
	},
};

// ============================================================================
// Test Functions
// ============================================================================

const testCalculateMetricsDiff: TestFunction = (): void => {
	console.log("🧪 Testing calculateMetricsDiff...");

	const diff: MetricsDiff = calculateMetricsDiff(
		mockBaseMetrics,
		mockCurrentMetrics,
	);

	// Test summary changes
	assert.strictEqual(
		diff.summary.totalFiles.change,
		1,
		"Total files change should be +1",
	);
	assert.strictEqual(
		diff.summary.totalFunctions.change,
		5,
		"Total functions change should be +5",
	);
	assert.strictEqual(
		diff.summary.averageComplexity.change,
		0.25,
		"Average complexity change should be +0.25",
	);
	assert.strictEqual(
		diff.summary.complexityDistribution.high.change,
		1,
		"High complexity functions change should be +1",
	);

	// Test file changes
	assert.strictEqual(
		diff.files.utils.status,
		"modified",
		"Utils should be marked as modified",
	);
	assert.strictEqual(
		diff.files.utils.functionCount.change,
		2,
		"Utils function count change should be +2",
	);
	assert.strictEqual(
		diff.files.utils.highComplexityFunctions.change,
		-1,
		"Utils high complexity functions should decrease by 1",
	);

	assert.strictEqual(
		diff.files["new-module"].status,
		"added",
		"New module should be marked as added",
	);
	assert.strictEqual(
		diff.files["new-module"].functionCount.change,
		8,
		"New module should have 8 functions",
	);

	console.log("✅ calculateMetricsDiff tests passed");
};

const testGenerateComparisonMarkdown: TestFunction = (): void => {
	console.log("🧪 Testing generateComparisonMarkdown...");

	const diff: MetricsDiff = calculateMetricsDiff(
		mockBaseMetrics,
		mockCurrentMetrics,
	);
	const changedFiles: string[] = ["src/utils.ts", "src/new-module.ts"];
	const markdown: string = generateComparisonMarkdown(diff, changedFiles);

	// Check that markdown contains expected sections
	assert(
		markdown.includes("## 📊 Complexity Metrics Comparison"),
		"Should contain main heading",
	);
	assert(
		markdown.includes("### 📈 Project Summary"),
		"Should contain project summary",
	);
	assert(
		markdown.includes("### 🎯 Complexity Distribution"),
		"Should contain complexity distribution",
	);
	assert(
		markdown.includes("### 📁 File Changes"),
		"Should contain file changes",
	);
	assert(
		markdown.includes("### 🎯 Focus: Changed Files in This PR"),
		"Should contain changed files focus",
	);

	// Check specific values
	assert(markdown.includes("📈 +1"), "Should show file count increase");
	assert(markdown.includes("📈 +5"), "Should show function count increase");
	assert(markdown.includes("🆕 added"), "Should show new module as added");
	assert(markdown.includes("📝 modified"), "Should show utils as modified");

	console.log("✅ generateComparisonMarkdown tests passed");
};

const testEdgeCases: TestFunction = (): void => {
	console.log("🧪 Testing edge cases...");

	// Test with empty metrics
	const emptyDiff: MetricsDiff = calculateMetricsDiff(
		{} as MockComplexityMetrics,
		{} as MockComplexityMetrics,
	);
	assert.strictEqual(
		emptyDiff.summary.totalFiles.change,
		0,
		"Empty metrics should show no change",
	);

	// Test with null metrics
	const nullDiff: MetricsDiff = calculateMetricsDiff(null, mockCurrentMetrics);
	assert.strictEqual(
		nullDiff.summary.totalFiles.current,
		6,
		"Should handle null base metrics",
	);

	console.log("✅ Edge case tests passed");
};

// ============================================================================
// Test Runner
// ============================================================================

const runTests: TestRunner = (): void => {
	console.log("🚀 Running complexity comparison tests...\n");

	try {
		testCalculateMetricsDiff();
		testGenerateComparisonMarkdown();
		testEdgeCases();

		console.log("\n🎉 All tests passed!");
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;

		console.error("\n❌ Test failed:", errorMessage);
		if (errorStack) {
			console.error(errorStack);
		}
		process.exit(1);
	}
};

// ============================================================================
// Module Entry Point
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
	runTests();
}

// ============================================================================
// Exports
// ============================================================================

export {
	testCalculateMetricsDiff,
	testGenerateComparisonMarkdown,
	testEdgeCases,
	runTests,
	mockBaseMetrics,
	mockCurrentMetrics,
};

export type { MockComplexityMetrics, MetricsDiff, TestFunction, TestRunner };
