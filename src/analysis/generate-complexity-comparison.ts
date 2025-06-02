#!/usr/bin/env node
/**
 * TypeScript version: Generate complexity metrics comparison between base and current branch
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import type {
	ComplexityMetricsData,
	FileChange,
	MetricChange,
	MetricsDiff,
	Nullable,
} from "../types/complexity-types.ts";

// ============================================================================
// File Loading Functions
// ============================================================================

function loadMetrics(filePath: string): Nullable<ComplexityMetricsData> {
	if (!fs.existsSync(filePath)) {
		console.error(`❌ Metrics file not found: ${filePath}`);
		return null;
	}

	try {
		const content = fs.readFileSync(filePath, "utf8");
		return JSON.parse(content) as ComplexityMetricsData;
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`❌ Error parsing metrics file ${filePath}:`, errorMessage);
		return null;
	}
}

// ============================================================================
// Metrics Calculation Functions
// ============================================================================

function calculateMetricsDiff(
	baseMetrics: Nullable<ComplexityMetricsData>,
	currentMetrics: Nullable<ComplexityMetricsData>,
): MetricsDiff {
	const diff: MetricsDiff = {
		files: {},
		summary: {
			totalFiles: {
				base: baseMetrics?.metadata?.totalFiles || 0,
				current: currentMetrics?.metadata?.totalFiles || 0,
				change: 0,
			},
			totalFunctions: {
				base: baseMetrics?.metadata?.totalFunctions || 0,
				current: currentMetrics?.metadata?.totalFunctions || 0,
				change: 0,
			},
			averageComplexity: {
				base: Number.parseFloat(
					baseMetrics?.projectMetrics?.averageCyclomaticComplexity || "0",
				),
				current: Number.parseFloat(
					currentMetrics?.projectMetrics?.averageCyclomaticComplexity || "0",
				),
				change: 0,
			},
			complexityDistribution: {
				high: {
					base: baseMetrics?.projectMetrics?.complexityDistribution?.high || 0,
					current:
						currentMetrics?.projectMetrics?.complexityDistribution?.high || 0,
					change: 0,
				},
				medium: {
					base:
						baseMetrics?.projectMetrics?.complexityDistribution?.medium || 0,
					current:
						currentMetrics?.projectMetrics?.complexityDistribution?.medium || 0,
					change: 0,
				},
				low: {
					base: baseMetrics?.projectMetrics?.complexityDistribution?.low || 0,
					current:
						currentMetrics?.projectMetrics?.complexityDistribution?.low || 0,
					change: 0,
				},
			},
		},
	};

	// Calculate summary changes
	diff.summary.totalFiles.change =
		diff.summary.totalFiles.current - diff.summary.totalFiles.base;
	diff.summary.totalFunctions.change =
		diff.summary.totalFunctions.current - diff.summary.totalFunctions.base;
	diff.summary.averageComplexity.change =
		diff.summary.averageComplexity.current -
		diff.summary.averageComplexity.base;
	diff.summary.complexityDistribution.high.change =
		diff.summary.complexityDistribution.high.current -
		diff.summary.complexityDistribution.high.base;
	diff.summary.complexityDistribution.medium.change =
		diff.summary.complexityDistribution.medium.current -
		diff.summary.complexityDistribution.medium.base;
	diff.summary.complexityDistribution.low.change =
		diff.summary.complexityDistribution.low.current -
		diff.summary.complexityDistribution.low.base;

	// Compare files
	const allFiles = new Set([
		...Object.keys(baseMetrics?.files || {}),
		...Object.keys(currentMetrics?.files || {}),
	]);

	for (const fileName of allFiles) {
		const baseFile = baseMetrics?.files?.[fileName];
		const currentFile = currentMetrics?.files?.[fileName];

		if (!baseFile && currentFile) {
			// New file
			diff.files[fileName] = {
				status: "added",
				functionCount: { change: currentFile.functionCount },
				averageComplexity: {
					change: Number.parseFloat(
						currentFile.metrics?.averageCyclomaticComplexity || "0",
					),
				},
				highComplexityFunctions: {
					change: currentFile.metrics?.highComplexityFunctions || 0,
				},
			};
		} else if (baseFile && !currentFile) {
			// Deleted file
			diff.files[fileName] = {
				status: "deleted",
				functionCount: { change: -baseFile.functionCount },
				averageComplexity: {
					change: -Number.parseFloat(
						baseFile.metrics?.averageCyclomaticComplexity || "0",
					),
				},
				highComplexityFunctions: {
					change: -(baseFile.metrics?.highComplexityFunctions || 0),
				},
			};
		} else if (baseFile && currentFile) {
			// Modified file
			const functionCountChange =
				currentFile.functionCount - baseFile.functionCount;
			const avgComplexityChange =
				Number.parseFloat(
					currentFile.metrics?.averageCyclomaticComplexity || "0",
				) -
				Number.parseFloat(baseFile.metrics?.averageCyclomaticComplexity || "0");
			const highComplexityChange =
				(currentFile.metrics?.highComplexityFunctions || 0) -
				(baseFile.metrics?.highComplexityFunctions || 0);

			if (
				functionCountChange !== 0 ||
				Math.abs(avgComplexityChange) > 0.01 ||
				highComplexityChange !== 0
			) {
				diff.files[fileName] = {
					status: "modified",
					functionCount: {
						base: baseFile.functionCount,
						current: currentFile.functionCount,
						change: functionCountChange,
					},
					averageComplexity: {
						base: Number.parseFloat(
							baseFile.metrics?.averageCyclomaticComplexity || "0",
						),
						current: Number.parseFloat(
							currentFile.metrics?.averageCyclomaticComplexity || "0",
						),
						change: avgComplexityChange,
					},
					highComplexityFunctions: {
						base: baseFile.metrics?.highComplexityFunctions || 0,
						current: currentFile.metrics?.highComplexityFunctions || 0,
						change: highComplexityChange,
					},
				};
			}
		}
	}

	return diff;
}

// ============================================================================
// Formatting Functions
// ============================================================================

function formatChange(value: number, showSign = true): string {
	if (value === 0) return "0";
	const sign = showSign && value > 0 ? "+" : "";
	return `${sign}${value}`;
}

function formatComplexityChange(value: number, showSign = true): string {
	if (Math.abs(value) < 0.01) return "0.00";
	const sign = showSign && value > 0 ? "+" : "";
	return `${sign}${value.toFixed(2)}`;
}

function getChangeIcon(value: number): string {
	if (value > 0) return "📈";
	if (value < 0) return "📉";
	return "➡️";
}

function getComplexityIcon(value: number): string {
	if (value > 0.5) return "🔴";
	if (value > 0.1) return "🟡";
	if (value < -0.1) return "🟢";
	return "➡️";
}

// ============================================================================
// Markdown Generation Functions
// ============================================================================

function generateComparisonMarkdown(
	diff: MetricsDiff,
	changedFiles?: string[],
): string {
	let markdown = "## 📊 Complexity Metrics Comparison\n\n";

	// Summary section
	markdown += "### 📈 Project Summary\n\n";
	markdown += "| Metric | Base | Current | Change |\n";
	markdown += "|--------|------|---------|--------|\n";
	markdown += `| Total Files | ${diff.summary.totalFiles.base} | ${diff.summary.totalFiles.current} | ${getChangeIcon(diff.summary.totalFiles.change)} ${formatChange(diff.summary.totalFiles.change)} |\n`;
	markdown += `| Total Functions | ${diff.summary.totalFunctions.base} | ${diff.summary.totalFunctions.current} | ${getChangeIcon(diff.summary.totalFunctions.change)} ${formatChange(diff.summary.totalFunctions.change)} |\n`;
	markdown += `| Average Complexity | ${diff.summary.averageComplexity.base.toFixed(2)} | ${diff.summary.averageComplexity.current.toFixed(2)} | ${getComplexityIcon(diff.summary.averageComplexity.change)} ${formatComplexityChange(diff.summary.averageComplexity.change)} |\n`;
	markdown += "\n";

	// Complexity distribution
	markdown += "### 🎯 Complexity Distribution\n\n";
	markdown += "| Level | Base | Current | Change |\n";
	markdown += "|-------|------|---------|--------|\n";
	markdown += `| 🔴 High | ${diff.summary.complexityDistribution.high.base} | ${diff.summary.complexityDistribution.high.current} | ${getChangeIcon(diff.summary.complexityDistribution.high.change)} ${formatChange(diff.summary.complexityDistribution.high.change)} |\n`;
	markdown += `| 🟡 Medium | ${diff.summary.complexityDistribution.medium.base} | ${diff.summary.complexityDistribution.medium.current} | ${getChangeIcon(diff.summary.complexityDistribution.medium.change)} ${formatChange(diff.summary.complexityDistribution.medium.change)} |\n`;
	markdown += `| 🟢 Low | ${diff.summary.complexityDistribution.low.base} | ${diff.summary.complexityDistribution.low.current} | ${getChangeIcon(diff.summary.complexityDistribution.low.change)} ${formatChange(diff.summary.complexityDistribution.low.change)} |\n`;
	markdown += "\n";

	// File changes
	const fileChanges = Object.entries(diff.files);
	if (fileChanges.length > 0) {
		markdown += "### 📁 File Changes\n\n";
		markdown +=
			"| File | Status | Functions | Avg Complexity | High Complexity Functions |\n";
		markdown +=
			"|------|--------|-----------|----------------|---------------------------|\n";

		for (const [fileName, changes] of fileChanges) {
			const statusIcon =
				changes.status === "added"
					? "🆕"
					: changes.status === "deleted"
						? "🗑️"
						: "📝";

			let functionsCell: string;
			let complexityCell: string;
			let highComplexityCell: string;

			if (changes.status === "added") {
				functionsCell = `+${changes.functionCount.change}`;
				complexityCell = `+${changes.averageComplexity.change.toFixed(2)}`;
				highComplexityCell = `+${changes.highComplexityFunctions.change}`;
			} else if (changes.status === "deleted") {
				functionsCell = `${changes.functionCount.change}`;
				complexityCell = `${changes.averageComplexity.change.toFixed(2)}`;
				highComplexityCell = `${changes.highComplexityFunctions.change}`;
			} else {
				// Modified file - these properties are guaranteed to exist for modified files
				const funcCount = changes.functionCount as MetricChange<number>;
				const avgComplexity = changes.averageComplexity as MetricChange<number>;
				const highComplexity =
					changes.highComplexityFunctions as MetricChange<number>;

				functionsCell = `${funcCount.base} → ${funcCount.current} (${formatChange(funcCount.change)})`;
				complexityCell = `${avgComplexity.base!.toFixed(2)} → ${avgComplexity.current!.toFixed(2)} (${formatComplexityChange(avgComplexity.change)})`;
				highComplexityCell = `${highComplexity.base} → ${highComplexity.current} (${formatChange(highComplexity.change)})`;
			}

			markdown += `| \`${fileName}\` | ${statusIcon} ${changes.status} | ${functionsCell} | ${complexityCell} | ${highComplexityCell} |\n`;
		}
		markdown += "\n";
	}

	// Changed files focus
	if (changedFiles && changedFiles.length > 0) {
		markdown += "### 🎯 Focus: Changed Files in This PR\n\n";
		const relevantChanges = changedFiles.filter((file) => {
			const fileName = path.basename(file, path.extname(file));
			return diff.files[fileName];
		});

		if (relevantChanges.length > 0) {
			markdown +=
				"The following files were modified in this PR and have complexity changes:\n\n";
			for (const file of relevantChanges) {
				const fileName = path.basename(file, path.extname(file));
				const changes = diff.files[fileName];
				if (changes) {
					markdown += `- **${file}**: ${changes.status}\n`;
				}
			}
		} else {
			markdown += "✅ No complexity changes detected in the modified files.\n";
		}
		markdown += "\n";
	}

	return markdown;
}

// ============================================================================
// Main Function
// ============================================================================

function main(): void {
	const baseMetricsFile =
		process.env.BASE_METRICS_FILE || "base-complexity-metrics.json";
	const currentMetricsFile =
		process.env.CURRENT_METRICS_FILE || "current-complexity-metrics.json";
	const changedFilesStr = process.env.CHANGED_FILES || "";
	const changedFiles = changedFilesStr.split(" ").filter((f) => f.trim());

	console.log("🔍 Generating complexity metrics comparison...");
	console.log(`📊 Base metrics: ${baseMetricsFile}`);
	console.log(`📊 Current metrics: ${currentMetricsFile}`);
	console.log(`📁 Changed files: ${changedFiles.join(", ") || "none"}`);

	const baseMetrics = loadMetrics(baseMetricsFile);
	const currentMetrics = loadMetrics(currentMetricsFile);

	if (!baseMetrics || !currentMetrics) {
		console.error("❌ Failed to load metrics files");
		process.exit(1);
	}

	const diff = calculateMetricsDiff(baseMetrics, currentMetrics);
	const markdown = generateComparisonMarkdown(diff, changedFiles);

	const outputFile = "complexity-comparison.md";
	fs.writeFileSync(outputFile, markdown);

	console.log(`✅ Complexity comparison written to ${outputFile}`);
	console.log(`📈 Summary: ${Object.keys(diff.files).length} files changed`);
}

// ============================================================================
// Module Entry Point
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}

// ============================================================================
// Exports
// ============================================================================

export { calculateMetricsDiff, generateComparisonMarkdown, loadMetrics };
export type { MetricsDiff, FileChange, MetricChange };
