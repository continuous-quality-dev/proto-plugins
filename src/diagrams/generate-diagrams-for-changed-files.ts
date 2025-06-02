#!/usr/bin/env node
/**
 * TypeScript version: Generate diagrams only for changed files in a PR
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import type {
	DiagramGenerationOptions,
	ExportInfo,
	FileAnalysis,
} from "./complexity-types.ts";

// ============================================================================
// File Analysis Functions
// ============================================================================

function getChangedTypeScriptFiles(changedFiles: string[]): string[] {
	return changedFiles
		.filter(
			(file) =>
				file.endsWith(".ts") &&
				!file.includes("test") &&
				!file.includes("spec"),
		)
		.filter((file) => fs.existsSync(file));
}

function analyzeTypeScriptFile(filePath: string): FileAnalysis {
	try {
		const content = fs.readFileSync(filePath, "utf8");
		const fileName = path.basename(filePath);

		// Extract functions (simplified version of dangerfile.js logic)
		const functionMatches =
			content.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g) || [];
		const arrowFunctionMatches =
			content.match(/(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/g) || [];
		const methodMatches = content.match(/^\s*(?:async\s+)?(\w+)\s*\(/gm) || [];

		const functions = [
			...functionMatches.map((match) =>
				match.replace(/(?:export\s+)?(?:async\s+)?function\s+/, ""),
			),
			...arrowFunctionMatches.map((match) =>
				match.replace(
					/(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/,
					"$1",
				),
			),
			...methodMatches.map((match) =>
				match.trim().replace(/(?:async\s+)?(\w+)\s*\(/, "$1"),
			),
		].filter((func) => func && func !== "main" && !func.includes("("));

		// Extract imports/dependencies
		const importMatches =
			content.match(/import\s+.*?\s+from\s+['"](\..*?)['"];?/g) || [];
		const dependencies = importMatches
			.map((imp) => imp.match(/from\s+['"](\..*?)['"];?/)?.[1])
			.filter(Boolean)
			.map((dep) => path.basename(dep as string, path.extname(dep as string)));

		// Extract exports
		const exportMatches =
			content.match(
				/export\s+(?:(?:async\s+)?function\s+(\w+)|const\s+(\w+)|class\s+(\w+)|interface\s+(\w+)|type\s+(\w+))/g,
			) || [];
		const exports: ExportInfo[] = exportMatches
			.map((exp): ExportInfo | null => {
				const functionMatch = exp.match(
					/export\s+(?:async\s+)?function\s+(\w+)/,
				);
				const constMatch = exp.match(/export\s+const\s+(\w+)/);
				const classMatch = exp.match(/export\s+class\s+(\w+)/);
				const interfaceMatch = exp.match(/export\s+interface\s+(\w+)/);
				const typeMatch = exp.match(/export\s+type\s+(\w+)/);

				if (functionMatch) return { name: functionMatch[1], type: "function" };
				if (constMatch) return { name: constMatch[1], type: "const" };
				if (classMatch) return { name: classMatch[1], type: "class" };
				if (interfaceMatch)
					return { name: interfaceMatch[1], type: "interface" };
				if (typeMatch) return { name: typeMatch[1], type: "type" };
				return null;
			})
			.filter((item): item is ExportInfo => item !== null);

		return {
			fileName,
			functions: [...new Set(functions)],
			dependencies,
			exports,
		};
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`Error analyzing ${filePath}:`, errorMessage);
		return {
			fileName: path.basename(filePath),
			functions: [],
			dependencies: [],
			exports: [],
		};
	}
}

// ============================================================================
// Diagram Generation Functions
// ============================================================================

function generateSingleFileDiagram(
	fileAnalysis: FileAnalysis,
	allAnalyses: FileAnalysis[],
): string {
	const fileName = fileAnalysis.fileName.replace(/\.ts$/, "");
	const lines = [
		"```mermaid",
		"graph TD",
		`    %% ${fileName} Function Dependencies`,
		"",
	];

	// Add function nodes
	const functions = fileAnalysis.functions || [];
	for (const [index, func] of functions.entries()) {
		lines.push(`    FUNC_${index}["${func}"]`);
	}

	if (functions.length > 0) {
		lines.push("");
	}

	// Add external dependencies
	const dependencies = fileAnalysis.dependencies || [];
	for (const [index, dep] of dependencies.entries()) {
		lines.push(`    DEP_${index}["${dep}"]:::external`);
	}

	if (dependencies.length > 0) {
		lines.push("");
		lines.push("    %% External Dependencies");
		for (const [depIndex, _dep] of dependencies.entries()) {
			for (const [funcIndex, _func] of functions.entries()) {
				lines.push(`    DEP_${depIndex} --> FUNC_${funcIndex}`);
			}
		}
		lines.push("");
	}

	// Add styling
	lines.push("    %% Styling");
	lines.push(
		"    classDef external fill:#ffe6e6,stroke:#d32f2f,stroke-width:2px",
	);
	lines.push(
		"    classDef internal fill:#e6f3ff,stroke:#1976d2,stroke-width:2px",
	);

	lines.push("```");
	return lines.join("\n");
}

function generateTypesUMLDiagram(fileAnalysis: FileAnalysis): string {
	const lines = [
		"```mermaid",
		"classDiagram",
		"    %% Proto Plugins Type Definitions",
		"",
	];

	const exports = fileAnalysis.exports || [];
	const interfaces = exports.filter((exp) => exp.type === "interface");
	const types = exports.filter((exp) => exp.type === "type");

	for (const iface of interfaces) {
		lines.push(`    class ${iface.name} {`);
		lines.push("        <<interface>>");
		lines.push("    }");
		lines.push("");
	}

	for (const type of types) {
		lines.push(`    class ${type.name} {`);
		lines.push("        <<type>>");
		lines.push("    }");
		lines.push("");
	}

	lines.push("```");
	return lines.join("\n");
}

function generateDiagramsForChangedFiles(
	changedFiles: string[],
	options: DiagramGenerationOptions = {},
): string {
	console.log("📊 Generating diagrams for changed files...");

	const tsFiles = getChangedTypeScriptFiles(changedFiles);
	console.log(
		`📁 Found ${tsFiles.length} TypeScript files to analyze:`,
		tsFiles,
	);

	if (tsFiles.length === 0) {
		return "## 📊 No TypeScript Files Changed\n\nNo TypeScript files were modified in this PR that require diagram updates.\n";
	}

	const analyses = tsFiles.map(analyzeTypeScriptFile);

	let markdown = "## 📊 Diagrams for Changed Files\n\n";
	markdown += `This analysis covers ${tsFiles.length} TypeScript file(s) modified in this PR.\n\n`;

	// Generate table of contents
	markdown += "### Table of Contents\n\n";
	for (const [index, analysis] of analyses.entries()) {
		const fileName = analysis.fileName.replace(/\.ts$/, "");
		markdown += `${index + 1}. [${fileName}](#${fileName.toLowerCase().replace(/[^a-z0-9]/g, "-")})\n`;
	}
	markdown += "\n";

	// Generate individual diagrams
	for (const analysis of analyses) {
		const fileName = analysis.fileName.replace(/\.ts$/, "");
		markdown += `### ${fileName}\n\n`;

		if (fileName === "types" || fileName.includes("types")) {
			// Special handling for types file
			markdown += generateTypesUMLDiagram(analysis);
		} else {
			// Regular function dependency diagram
			markdown += generateSingleFileDiagram(analysis, analyses);
		}

		markdown += "\n\n";

		// Add summary
		const functions = analysis.functions || [];
		const dependencies = analysis.dependencies || [];
		const exports = analysis.exports || [];

		markdown += `**Summary for ${fileName}:**\n`;
		markdown += `- Functions: ${functions.length}\n`;
		markdown += `- Dependencies: ${dependencies.length}\n`;
		markdown += `- Exports: ${exports.length}\n\n`;
	}

	markdown += "---\n";
	markdown += `*Generated automatically for changed files on ${new Date().toISOString()}*\n`;

	return markdown;
}

// ============================================================================
// Main Function
// ============================================================================

function main(): void {
	const changedFilesStr = process.env.CHANGED_FILES || "";
	const changedFiles = changedFilesStr.split(" ").filter((f) => f.trim());

	console.log("🎨 Generating diagrams for changed files...");
	console.log(`📁 Changed files: ${changedFiles.join(", ") || "none"}`);

	const diagramContent = generateDiagramsForChangedFiles(changedFiles);

	const outputFile = "changed-files-diagrams.md";
	fs.writeFileSync(outputFile, diagramContent);

	console.log(`✅ Diagrams written to ${outputFile}`);
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

export {
	generateDiagramsForChangedFiles,
	analyzeTypeScriptFile,
	getChangedTypeScriptFiles,
	generateSingleFileDiagram,
	generateTypesUMLDiagram,
};

export type { FileAnalysis, ExportInfo, DiagramGenerationOptions };
