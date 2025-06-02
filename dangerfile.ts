#!/usr/bin/env node
/**
 * TypeScript version: Danger.js file that generates a Mermaid diagram of the files and function DAG
 * This analyzes TypeScript files in the src/ directory and creates a dependency graph
 */

import { readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

import { parse } from "@typescript-eslint/typescript-estree";

import type {
	ComplexityMetrics,
	ComplexityMetricsOutput,
	DangerContext,
	DangerFileComplexityData,
	DiagramData,
	ExportedItem,
	FileAnalysisDetailed,
	FileComplexityMetrics,
	FunctionComplexityData,
	ImportInfo,
	MarkdownFunction,
	Nullable,
	ProjectComplexityMetrics,
	WarnFunction,
} from "./src/types/complexity-types.ts";

// Danger.js imports (only available when running in Danger context)
let danger: DangerContext;
let markdown: MarkdownFunction;
let warn: WarnFunction;

try {
	const dangerPkg = await import("danger");
	({ danger, markdown, warn } = dangerPkg);
} catch (e) {
	// Running outside Danger context - create mock functions
	danger = { git: { modified_files: [], created_files: [] } };
	markdown = (text: string) => console.log("MARKDOWN:", text);
	warn = (text: string) => console.warn("WARN:", text);
}

// Configuration
const SRC_DIR = "src";
const OUTPUT_FILE = "CODEBASE_DIAGRAM.md";
const IGNORE_PATTERNS = [/\.test\.ts$/, /\.spec\.ts$/];

// ============================================================================
// File Analysis Functions
// ============================================================================

/**
 * Extract imports and exports from a TypeScript file
 */
function analyzeTypeScriptFile(filePath: string): FileAnalysisDetailed {
	try {
		const content = readFileSync(filePath, "utf8");
		const ast = parse(content, {
			loc: true,
			range: true,
			tokens: false,
			comments: false,
			errorOnUnknownASTType: false,
			errorOnTypeScriptSyntacticAndSemanticIssues: false,
			jsx: false,
		});

		const analysis: FileAnalysisDetailed = {
			fileName: basename(filePath),
			filePath: filePath,
			imports: [],
			exports: [],
			functions: [],
			dependencies: [],
		};

		// Walk the AST to extract information
		function walkNode(node: unknown): void {
			if (!node || typeof node !== "object" || !("type" in node)) return;

			const astNode = node as Record<string, unknown> & { type: string };

			switch (astNode.type) {
				case "ImportDeclaration":
					if (
						astNode.source &&
						typeof astNode.source === "object" &&
						"value" in astNode.source
					) {
						const importPath = (astNode.source as { value: string }).value;
						// Only track local imports (starting with ./ or ../) and skip type-only imports
						if (importPath.startsWith("./") || importPath.startsWith("../")) {
							// Skip type-only imports
							if (astNode.importKind === "type") {
								break;
							}

							const resolvedPath = importPath
								.replace(/\.ts$/, "")
								.replace(/^\.\//, "");
							analysis.dependencies.push(resolvedPath);

							// Extract imported names (skip type-only imports)
							if (astNode.specifiers && Array.isArray(astNode.specifiers)) {
								for (const spec of astNode.specifiers as Record<
									string,
									unknown
								>[]) {
									// Skip type-only specifiers
									if (spec.importKind === "type") {
										continue;
									}

									if (
										spec.type === "ImportSpecifier" &&
										spec.imported &&
										typeof spec.imported === "object" &&
										"name" in spec.imported
									) {
										analysis.imports.push({
											name: (spec.imported as { name: string }).name,
											from: resolvedPath,
											type: "named",
										});
									} else if (
										spec.type === "ImportDefaultSpecifier" &&
										spec.local &&
										typeof spec.local === "object" &&
										"name" in spec.local
									) {
										analysis.imports.push({
											name: (spec.local as { name: string }).name,
											from: resolvedPath,
											type: "default",
										});
									}
								}
							}
						}
					}
					break;

				case "ExportNamedDeclaration":
					if (astNode.declaration && typeof astNode.declaration === "object") {
						const declaration = astNode.declaration as Record<string, unknown>;
						if (
							declaration.type === "FunctionDeclaration" &&
							declaration.id &&
							typeof declaration.id === "object" &&
							"name" in declaration.id
						) {
							const functionName = (declaration.id as { name: string }).name;
							analysis.exports.push({
								name: functionName,
								type: "function",
							});
							analysis.functions.push(functionName);
						} else if (
							declaration.type === "VariableDeclaration" &&
							Array.isArray(declaration.declarations)
						) {
							for (const decl of declaration.declarations as Record<
								string,
								unknown
							>[]) {
								if (
									decl.id &&
									typeof decl.id === "object" &&
									"name" in decl.id
								) {
									analysis.exports.push({
										name: (decl.id as { name: string }).name,
										type: "variable",
									});
								}
							}
						}
					}
					break;

				case "ExportDefaultDeclaration":
					if (
						astNode.declaration &&
						typeof astNode.declaration === "object" &&
						"id" in astNode.declaration
					) {
						const declaration = astNode.declaration as { id: { name: string } };
						if (
							declaration.id &&
							typeof declaration.id === "object" &&
							"name" in declaration.id
						) {
							analysis.exports.push({
								name: declaration.id.name,
								type: "default",
							});
						}
					}
					break;

				case "FunctionDeclaration":
					if (
						astNode.id &&
						typeof astNode.id === "object" &&
						"name" in astNode.id
					) {
						analysis.functions.push((astNode.id as { name: string }).name);
					}
					break;
			}

			// Recursively walk child nodes
			for (const key in astNode) {
				const child = astNode[key];
				if (Array.isArray(child)) {
					for (const childNode of child) {
						walkNode(childNode);
					}
				} else if (child && typeof child === "object" && "type" in child) {
					walkNode(child);
				}
			}
		}

		walkNode(ast);
		// Remove duplicates from dependencies
		analysis.dependencies = [...new Set(analysis.dependencies)];
		return analysis;
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.warn(`Failed to analyze ${filePath}:`, errorMessage);
		return {
			fileName: basename(filePath),
			filePath: filePath,
			imports: [],
			exports: [],
			functions: [],
			dependencies: [],
		};
	}
}

/**
 * Get all TypeScript files in the src directory (recursively)
 */
async function getTypeScriptFiles(): Promise<string[]> {
	const files: string[] = [];

	async function walkDirectory(dir: string): Promise<void> {
		try {
			const { readdirSync, statSync } = await import("node:fs");
			const entries = readdirSync(dir);

			for (const entry of entries) {
				const fullPath = join(dir, entry);
				const stat = statSync(fullPath);

				if (stat.isDirectory()) {
					// Recursively walk subdirectories
					await walkDirectory(fullPath);
				} else if (stat.isFile() && entry.endsWith(".ts")) {
					// Skip test files
					if (!IGNORE_PATTERNS.some((pattern) => pattern.test(entry))) {
						files.push(fullPath);
					}
				}
			}
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(`Error reading directory ${dir}:`, errorMessage);
		}
	}

	await walkDirectory(SRC_DIR);
	return files;
}

// ============================================================================
// Complexity Calculation Functions
// ============================================================================

/**
 * Calculate complexity metrics based on function name patterns and context
 */
function calculateComplexityMetrics(
	funcName: string,
	fileName: string,
	allFunctions: string[],
): ComplexityMetrics {
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
		complexity = "🔴 High";
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

// ============================================================================
// Diagram Generation Functions
// ============================================================================

/**
 * Generate individual Mermaid diagrams for each non-test file
 */
function generateIndividualDiagrams(
	analyses: FileAnalysisDetailed[],
): DiagramData[] {
	const diagrams: DiagramData[] = [];

	// Filter out test files
	const nonTestAnalyses = analyses.filter(
		(analysis) =>
			!analysis.fileName.includes("test") &&
			!analysis.fileName.includes("spec"),
	);

	for (const analysis of nonTestAnalyses) {
		const fileName = analysis.fileName.replace(/\.ts$/, "");
		const diagram = generateSingleFileDiagram(analysis, analyses);
		diagrams.push({
			fileName,
			diagram,
		});
	}

	return diagrams;
}

/**
 * Generate UML class diagram for types file
 */
function generateTypesUMLDiagram(fileAnalysis: FileAnalysisDetailed): string {
	const lines = [
		"```mermaid",
		"classDiagram",
		"    %% Proto Plugins Type Definitions",
		"",
	];

	// Define the main type categories and their relationships
	lines.push("    %% GitHub API Types");
	lines.push("    class GitHubAsset {");
	lines.push("        +string name");
	lines.push('        +string "browser_download_url"');
	lines.push('        +string "content_type"');
	lines.push("        +number size");
	lines.push('        +number "download_count"');
	lines.push("    }");
	lines.push("");

	lines.push("    class GitHubRelease {");
	lines.push('        +string "tag_name"');
	lines.push("        +string name");
	lines.push("        +GitHubAsset[] assets");
	lines.push("        +string body");
	lines.push("    }");
	lines.push("");

	lines.push("    class GitHubRepository {");
	lines.push("        +string name");
	lines.push("        +string description");
	lines.push('        +string "html_url"');
	lines.push("        +string homepage");
	lines.push("    }");
	lines.push("");

	lines.push("    class ParsedGitHubUrl {");
	lines.push("        +string owner");
	lines.push("        +string repo");
	lines.push("    }");
	lines.push("");

	lines.push("    %% Proto Plugin Types");
	lines.push("    class PlatformConfig {");
	lines.push('        +string "download-file"');
	lines.push('        +string "archive-prefix"');
	lines.push('        +string "bin-path"');
	lines.push('        +string "checksum-file"?');
	lines.push("    }");
	lines.push("");

	lines.push("    class ProtoPlugin {");
	lines.push("        +string name");
	lines.push("        +string type");
	lines.push("        +string description");
	lines.push("        +Map~string,PlatformConfig~ platform");
	lines.push("        +InstallConfig install");
	lines.push("        +ResolveConfig resolve");
	lines.push("    }");
	lines.push("");

	lines.push("    class InstallConfig {");
	lines.push('        +string "download-url"');
	lines.push("        +Map~string,string~ arch?");
	lines.push("    }");
	lines.push("");

	lines.push("    class ResolveConfig {");
	lines.push('        +string "git-url"');
	lines.push("    }");
	lines.push("");

	lines.push("    %% Analysis Types");
	lines.push("    class PlatformAssets {");
	lines.push("        +GitHubAsset[] linux");
	lines.push("        +GitHubAsset[] macos");
	lines.push("        +GitHubAsset[] windows");
	lines.push("    }");
	lines.push("");

	lines.push("    class AnalyzedAssets {");
	lines.push("        +PlatformAssets platforms");
	lines.push("        +string[] architectures");
	lines.push("    }");
	lines.push("");

	lines.push("    %% Registry Types");
	lines.push("    class BaseProtoRegistryEntry {");
	lines.push("        +string id");
	lines.push("        +string locator");
	lines.push("        +string description");
	lines.push("        +string author");
	lines.push("    }");
	lines.push("");

	lines.push("    class ProtoRegistryEntry {");
	lines.push("        +string name");
	lines.push("        +string format");
	lines.push("        +string homepageUrl");
	lines.push("        +string repositoryUrl");
	lines.push("        +string devicon");
	lines.push("        +string[] bins");
	lines.push("    }");
	lines.push("");

	lines.push("    class LocalPlugin {");
	lines.push("        +string path");
	lines.push("        +string name");
	lines.push("        +string description");
	lines.push("        +string locator");
	lines.push("        +string author");
	lines.push("    }");
	lines.push("");

	lines.push("    %% Relationships");
	lines.push("    GitHubRelease --o GitHubAsset : contains");
	lines.push("    ProtoPlugin --o PlatformConfig : platform");
	lines.push("    ProtoPlugin -- InstallConfig : install");
	lines.push("    ProtoPlugin -- ResolveConfig : resolve");
	lines.push("    AnalyzedAssets -- PlatformAssets : platforms");
	lines.push('    PlatformAssets --o GitHubAsset : "platform assets"');
	lines.push("    ProtoRegistryEntry --|> BaseProtoRegistryEntry : extends");
	lines.push("");

	lines.push("```");

	return lines.join("\n");
}

/**
 * Generate function grouping diagram for utils file
 */
function generateUtilsFunctionGrouping(
	fileAnalysis: FileAnalysisDetailed,
): string {
	const lines = [
		"```mermaid",
		"graph TB",
		"    %% Utils Functions Grouped by Purpose",
		"",
	];

	// Define function categories
	const categories: Record<string, string[]> = {
		"GitHub API": ["parseGitHubUrl", "fetchGitHubRelease", "fetchGitHubRepo"],
		"File Operations": ["readProtoPlugin", "writeProtoPlugin", "parseToml"],
		"Proto Tools": [
			"checkProtoInstalled",
			"getProtoToolsDir",
			"installPluginToProto",
			"installToolWithProto",
			"testToolWithProto",
			"getInstalledVersion",
			"fetchLatestVersion",
		],
		"CLI Utilities": [
			"parseArgs",
			"showHelp",
			"showUsage",
			"hasFlag",
			"getFlagValue",
			"simplePrompt",
		],
		"Runtime & System": [
			"detectRuntime",
			"execCommand",
			"loadCurrentProtoTools",
		],
		"Act Integration": [
			"checkActInstallation",
			"installActWithProto",
			"getActCommand",
			"createActConfig",
			"createSecretsFile",
			"createEventFile",
			"getAvailableWorkflows",
		],
	};

	const icons: Record<string, string> = {
		"GitHub API": "🐙",
		"File Operations": "📁",
		"Proto Tools": "⚙️",
		"CLI Utilities": "💻",
		"Runtime & System": "🔧",
		"Act Integration": "🎭",
	};

	const colors: Record<string, string> = {
		"GitHub API": "fill:#f9f,stroke:#333,stroke-width:2px",
		"File Operations": "fill:#bbf,stroke:#333,stroke-width:2px",
		"Proto Tools": "fill:#bfb,stroke:#333,stroke-width:2px",
		"CLI Utilities": "fill:#ffb,stroke:#333,stroke-width:2px",
		"Runtime & System": "fill:#fbb,stroke:#333,stroke-width:2px",
		"Act Integration": "fill:#bff,stroke:#333,stroke-width:2px",
	};

	let nodeCounter = 0;

	for (const [category, functions] of Object.entries(categories)) {
		const icon = icons[category];
		lines.push(`    subgraph "${icon} ${category}"`);

		for (const funcName of functions) {
			if (fileAnalysis.functions.includes(funcName)) {
				const nodeId = `FUNC_${nodeCounter++}`;
				lines.push(`        ${nodeId}["${funcName}"]`);
			}
		}

		lines.push("    end");
		lines.push("");
	}

	lines.push("```");
	return lines.join("\n");
}

/**
 * Generate function complexity analysis table
 */
function generateFunctionComplexity(
	fileAnalysis: FileAnalysisDetailed,
	fileName: string,
): string {
	const lines = [
		`#### ${fileName} Function Complexity Analysis`,
		"",
		"| Function | Complexity | Cyclomatic | LOC | Params | Description |",
		"|----------|------------|------------|-----|--------|-------------|",
	];

	const uniqueFunctions = [...new Set(fileAnalysis.functions)];

	for (const funcName of uniqueFunctions) {
		const metrics = calculateComplexityMetrics(
			funcName,
			fileName,
			uniqueFunctions,
		);
		lines.push(
			`| \`${funcName}\` | ${metrics.complexity} | ${metrics.cyclomatic} | ${metrics.loc} | ${metrics.params} | ${metrics.description} |`,
		);
	}

	lines.push("");
	lines.push("**Complexity Metrics:**");
	lines.push(
		"- **Cyclomatic Complexity**: Number of independent execution paths (1-3: Low, 4-6: Medium, 7+: High)",
	);
	lines.push("- **LOC**: Estimated Lines of Code");
	lines.push("- **Params**: Number of function parameters");
	lines.push("");
	lines.push("**Complexity Legend:**");
	lines.push(
		"- 🔴 **High (7+ paths)**: Main functions, complex business logic, multiple decision points",
	);
	lines.push(
		"- 🟡 **Medium (4-6 paths)**: Processing functions, API calls, data transformation",
	);
	lines.push(
		"- 🟢 **Low (1-3 paths)**: Simple utilities, getters/setters, basic operations",
	);

	return lines.join("\n");
}

/**
 * Generate Mermaid diagram for a single file showing its functions and dependencies
 */
function generateSingleFileDiagram(
	fileAnalysis: FileAnalysisDetailed,
	allAnalyses: FileAnalysisDetailed[],
): string {
	const fileName = fileAnalysis.fileName.replace(/\.ts$/, "");

	// Special handling for types file
	if (fileName === "types") {
		return generateTypesUMLDiagram(fileAnalysis);
	}

	// Special handling for utils file - show function grouping
	if (fileName === "utils") {
		return [
			"### Function Dependencies",
			generateOriginalFunctionDiagram(fileAnalysis, allAnalyses, fileName),
			"",
			"### Function Grouping by Purpose",
			generateUtilsFunctionGrouping(fileAnalysis),
			"",
			"### Function Complexity Analysis",
			generateFunctionComplexity(fileAnalysis, fileName),
		].join("\n");
	}

	// For other files, show multiple visualizations
	return [
		"### Function Dependencies",
		generateOriginalFunctionDiagram(fileAnalysis, allAnalyses, fileName),
		"",
		"### Function Complexity Analysis",
		generateFunctionComplexity(fileAnalysis, fileName),
	].join("\n");
}

/**
 * Generate original function dependency diagram (extracted for reuse)
 */
function generateOriginalFunctionDiagram(
	fileAnalysis: FileAnalysisDetailed,
	allAnalyses: FileAnalysisDetailed[],
	fileName: string,
): string {
	const lines = [
		"```mermaid",
		"graph TD",
		`    %% ${fileName} Function Dependencies`,
		"",
	];

	// Define node styles
	lines.push("    %% Node Styles");
	lines.push(
		"    classDef utilFunction fill:#e1f5fe,stroke:#01579b,stroke-width:2px",
	);
	lines.push(
		"    classDef generatorFunction fill:#f3e5f5,stroke:#4a148c,stroke-width:2px",
	);
	lines.push(
		"    classDef testFunction fill:#fff3e0,stroke:#e65100,stroke-width:2px",
	);
	lines.push(
		"    classDef typeFunction fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px",
	);
	lines.push(
		"    classDef externalFunction fill:#fff2cc,stroke:#d6b656,stroke-width:2px",
	);
	lines.push(
		"    classDef fileNode fill:#f5f5f5,stroke:#666,stroke-width:3px,stroke-dasharray: 5 5",
	);
	lines.push("");

	let nodeCounter = 0;
	const functionNodeMap = new Map<string, string>();

	// Determine file type for styling
	function getFileTypeClass(name: string): string {
		if (name.includes("utils") || name.includes("types")) {
			return "utilFunction";
		}
		if (name.includes("generate")) {
			return "generatorFunction";
		}
		if (name.includes("test")) {
			return "testFunction";
		}
		return "typeFunction";
	}

	// Add the main file node
	const fileNodeId = `FILE_${nodeCounter++}`;
	lines.push(`    %% Main File: ${fileName}`);
	lines.push(`    ${fileNodeId}["📁 ${fileName}"]:::fileNode`);
	lines.push("");

	// Add function nodes for this file
	lines.push(`    %% Functions in ${fileName}`);
	const uniqueFunctions = [...new Set(fileAnalysis.functions)];
	const mainFileClass = getFileTypeClass(fileName);

	for (const funcName of uniqueFunctions) {
		const funcNodeId = `FUNC_${nodeCounter++}`;
		functionNodeMap.set(`${fileName}.${funcName}`, funcNodeId);
		lines.push(`    ${funcNodeId}["${funcName}"]:::${mainFileClass}`);
		lines.push(`    ${fileNodeId} --> ${funcNodeId}`);
	}

	// Add external dependencies
	const externalFunctions = new Set<string>();
	const externalFiles = new Set<string>();

	for (const importInfo of fileAnalysis.imports) {
		const targetFileName = importInfo.from;
		const importedFunctionName = importInfo.name;

		// Find the target analysis to check if the imported name is a function
		const targetAnalysis = allAnalyses.find(
			(a) => a.fileName.replace(/\.ts$/, "") === targetFileName,
		);

		if (targetAnalysis) {
			// Check if the imported name is an exported function
			const isExportedFunction = targetAnalysis.exports.some(
				(exp) => exp.name === importedFunctionName && exp.type === "function",
			);

			if (isExportedFunction) {
				externalFiles.add(targetFileName);
				externalFunctions.add(`${targetFileName}.${importedFunctionName}`);
			}
		}
	}

	// Add external file nodes and functions
	if (externalFiles.size > 0) {
		lines.push("");
		lines.push("    %% External Dependencies");

		for (const extFileName of externalFiles) {
			const extFileNodeId = `EXT_FILE_${nodeCounter++}`;
			lines.push(`    ${extFileNodeId}["📁 ${extFileName}"]:::fileNode`);

			// Add only the imported functions from this external file
			for (const extFunc of externalFunctions) {
				if (extFunc.startsWith(`${extFileName}.`)) {
					const funcName = extFunc.split(".")[1];
					const extFuncNodeId = `EXT_FUNC_${nodeCounter++}`;
					functionNodeMap.set(extFunc, extFuncNodeId);
					const extFileClass = getFileTypeClass(extFileName);
					lines.push(`    ${extFuncNodeId}["${funcName}"]:::${extFileClass}`);
					lines.push(`    ${extFileNodeId} --> ${extFuncNodeId}`);
				}
			}
		}
	}

	// Add dependencies between functions
	if (externalFunctions.size > 0) {
		lines.push("");
		lines.push("    %% Function Dependencies");

		for (const importInfo of fileAnalysis.imports) {
			const targetFileName = importInfo.from;
			const importedFunctionName = importInfo.name;

			// Find the target analysis to check if the imported name is a function
			const targetAnalysis = allAnalyses.find(
				(a) => a.fileName.replace(/\.ts$/, "") === targetFileName,
			);

			if (targetAnalysis) {
				// Check if the imported name is an exported function
				const isExportedFunction = targetAnalysis.exports.some(
					(exp) => exp.name === importedFunctionName && exp.type === "function",
				);

				if (isExportedFunction) {
					// Create edges from main function to imported functions
					const mainFunction =
						fileAnalysis.functions.find((f) => f === "main") ||
						fileAnalysis.functions[0];
					if (mainFunction) {
						const sourceFuncNodeId = functionNodeMap.get(
							`${fileName}.${mainFunction}`,
						);
						const targetFuncNodeId = functionNodeMap.get(
							`${targetFileName}.${importedFunctionName}`,
						);

						if (sourceFuncNodeId && targetFuncNodeId) {
							lines.push(`    ${sourceFuncNodeId} --> ${targetFuncNodeId}`);
						}
					}
				}
			}
		}
	}

	lines.push("");
	lines.push("```");

	return lines.join("\n");
}

// ============================================================================
// Overview and Analysis Functions
// ============================================================================

/**
 * Generate overview diagram showing all files and their relationships
 */
function generateOverviewDiagram(analyses: FileAnalysisDetailed[]): string {
	const lines = [
		"```mermaid",
		"graph TD",
		"    %% Proto Plugins Codebase Overview",
		"",
	];

	// Define node styles
	lines.push("    %% Node Styles");
	lines.push(
		"    classDef utilFile fill:#e1f5fe,stroke:#01579b,stroke-width:2px",
	);
	lines.push(
		"    classDef generatorFile fill:#f3e5f5,stroke:#4a148c,stroke-width:2px",
	);
	lines.push(
		"    classDef testFile fill:#fff3e0,stroke:#e65100,stroke-width:2px",
	);
	lines.push(
		"    classDef typeFile fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px",
	);
	lines.push("");

	// Create nodes for each file
	lines.push("    %% File Nodes");
	const nodeMap = new Map<string, string>();

	for (const [index, analysis] of analyses.entries()) {
		const nodeId = `F${index}`;
		const fileName = analysis.fileName.replace(/\.ts$/, "");
		nodeMap.set(analysis.fileName, nodeId);

		// Determine file type for styling
		let cssClass = "";
		if (fileName.includes("utils") || fileName.includes("types")) {
			cssClass = "utilFile";
		} else if (fileName.includes("generate")) {
			cssClass = "generatorFile";
		} else if (fileName.includes("test")) {
			cssClass = "testFile";
		} else {
			cssClass = "typeFile";
		}

		lines.push(`    ${nodeId}["${fileName}"]:::${cssClass}`);
	}

	lines.push("");
	lines.push("    %% Dependencies");

	// Create edges for dependencies
	for (const analysis of analyses) {
		const sourceNodeId = nodeMap.get(analysis.fileName);

		for (const dep of analysis.dependencies) {
			const depFileName = `${dep}.ts`;
			const targetNodeId = nodeMap.get(depFileName);

			if (targetNodeId && sourceNodeId !== targetNodeId) {
				lines.push(`    ${sourceNodeId} --> ${targetNodeId}`);
			}
		}
	}

	lines.push("");
	lines.push("```");

	return lines.join("\n");
}

/**
 * Generate detailed analysis table
 */
function generateAnalysisTable(analyses: FileAnalysisDetailed[]): string {
	const lines = [
		"",
		"## File Analysis Details",
		"",
		"| File | Functions | Exports | Dependencies |",
		"|------|-----------|---------|--------------|",
	];

	for (const analysis of analyses) {
		const fileName = analysis.fileName;
		const functions =
			analysis.functions.length > 0 ? analysis.functions.join(", ") : "None";
		const exports =
			analysis.exports.length > 0
				? analysis.exports.map((e) => `${e.name} (${e.type})`).join(", ")
				: "None";
		const deps =
			analysis.dependencies.length > 0
				? analysis.dependencies.join(", ")
				: "None";

		lines.push(`| ${fileName} | ${functions} | ${exports} | ${deps} |`);
	}

	return lines.join("\n");
}

/**
 * Generate complexity metrics JSON output
 */
function generateComplexityMetricsJSON(
	analyses: FileAnalysisDetailed[],
): ComplexityMetricsOutput {
	const complexityData: ComplexityMetricsOutput = {
		metadata: {
			generatedAt: new Date().toISOString(),
			totalFiles: analyses.length,
			totalFunctions: analyses.reduce(
				(sum, analysis) => sum + analysis.functions.length,
				0,
			),
		},
		files: {},
		projectMetrics: {
			averageCyclomaticComplexity: "0",
			totalEstimatedLOC: 0,
			complexityDistribution: {
				high: 0,
				medium: 0,
				low: 0,
			},
			mostComplexFunctions: [],
		},
	};

	for (const analysis of analyses) {
		const fileName = analysis.fileName.replace(/\.ts$/, "");
		const functions = analysis.functions || [];

		complexityData.files[fileName] = {
			path: analysis.fileName,
			functionCount: functions.length,
			dependencies: analysis.dependencies,
			exports: analysis.exports,
			functions: {},
			metrics: {
				averageCyclomaticComplexity: "0",
				totalEstimatedLOC: 0,
				highComplexityFunctions: 0,
				mediumComplexityFunctions: 0,
				lowComplexityFunctions: 0,
			},
		};

		for (const funcName of functions) {
			const metrics = calculateComplexityMetrics(funcName, fileName, functions);
			complexityData.files[fileName].functions[funcName] = {
				complexity: metrics.complexity,
				cyclomaticComplexity: metrics.cyclomatic,
				estimatedLOC: metrics.loc,
				parameterCount: metrics.params,
				description: metrics.description,
				complexityLevel: metrics.complexity.includes("High")
					? "high"
					: metrics.complexity.includes("Medium")
						? "medium"
						: "low",
			};
		}

		// Add file-level metrics
		const fileFunctions = Object.values(
			complexityData.files[fileName].functions,
		);
		complexityData.files[fileName].metrics = {
			averageCyclomaticComplexity:
				fileFunctions.length > 0
					? (
							fileFunctions.reduce(
								(sum, f) => sum + f.cyclomaticComplexity,
								0,
							) / fileFunctions.length
						).toFixed(2)
					: "0",
			totalEstimatedLOC: fileFunctions.reduce(
				(sum, f) => sum + f.estimatedLOC,
				0,
			),
			highComplexityFunctions: fileFunctions.filter(
				(f) => f.complexityLevel === "high",
			).length,
			mediumComplexityFunctions: fileFunctions.filter(
				(f) => f.complexityLevel === "medium",
			).length,
			lowComplexityFunctions: fileFunctions.filter(
				(f) => f.complexityLevel === "low",
			).length,
		};
	}

	// Add overall project metrics
	const allFunctions = Object.values(complexityData.files).flatMap((file) =>
		Object.values(file.functions),
	);
	complexityData.projectMetrics = {
		averageCyclomaticComplexity:
			allFunctions.length > 0
				? (
						allFunctions.reduce((sum, f) => sum + f.cyclomaticComplexity, 0) /
						allFunctions.length
					).toFixed(2)
				: "0",
		totalEstimatedLOC: allFunctions.reduce((sum, f) => sum + f.estimatedLOC, 0),
		complexityDistribution: {
			high: allFunctions.filter((f) => f.complexityLevel === "high").length,
			medium: allFunctions.filter((f) => f.complexityLevel === "medium").length,
			low: allFunctions.filter((f) => f.complexityLevel === "low").length,
		},
		mostComplexFunctions: allFunctions
			.sort((a, b) => b.cyclomaticComplexity - a.cyclomaticComplexity)
			.slice(0, 10)
			.map((f) => {
				// Find which file and function this belongs to
				for (const [fileName, fileData] of Object.entries(
					complexityData.files,
				)) {
					for (const [funcName, funcData] of Object.entries(
						fileData.functions,
					)) {
						if (funcData === f) {
							return {
								file: fileName,
								function: funcName,
								cyclomaticComplexity: f.cyclomaticComplexity,
								complexityLevel: f.complexityLevel,
								estimatedLOC: f.estimatedLOC,
							};
						}
					}
				}
				return null;
			})
			.filter((item): item is NonNullable<typeof item> => item !== null),
	};

	return complexityData;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Main function to analyze codebase and generate diagram
 */
async function generateCodebaseDiagram(): Promise<string> {
	console.log("🔍 Analyzing TypeScript files in src/ directory...");

	const tsFiles = await getTypeScriptFiles();
	console.log(`Found ${tsFiles.length} TypeScript files to analyze`);

	if (tsFiles.length === 0) {
		warn("No TypeScript files found in src/ directory");
		return "";
	}

	const analyses = tsFiles.map(analyzeTypeScriptFile);

	// Generate complexity metrics JSON
	const complexityMetrics = generateComplexityMetricsJSON(analyses);
	writeFileSync(
		"complexity-metrics.json",
		JSON.stringify(complexityMetrics, null, 2),
	);
	console.log("✅ Generated complexity metrics: complexity-metrics.json");

	// Generate individual diagrams for each non-test file
	const individualDiagrams = generateIndividualDiagrams(analyses);
	const overviewDiagram = generateOverviewDiagram(analyses);

	// Generate the complete markdown content
	// Generate table of contents
	const tableOfContents = [
		"## Table of Contents",
		"",
		"1. [Overview - File Dependencies](#overview---file-dependencies)",
		"2. [Individual File Function Diagrams](#individual-file-function-diagrams)",
		...individualDiagrams.map(
			({ fileName }) =>
				`   - [${fileName}](#${fileName.toLowerCase().replace(/[^a-z0-9]/g, "-")})`,
		),
		"3. [File Analysis Details](#file-analysis-details)",
		"",
	];

	const content = [
		"# Proto Plugins Codebase Diagrams",
		"",
		"This document shows the file and function dependencies in the proto-plugins codebase.",
		"",
		...tableOfContents,
		"## Overview - File Dependencies",
		"",
		overviewDiagram,
		"",
		"## Individual File Function Diagrams",
		"",
		"Each diagram below shows the functions within a specific file and their dependencies on external functions.",
		"",
		...individualDiagrams.flatMap(({ fileName, diagram }) => [
			`### ${fileName}`,
			"",
			diagram,
			"",
		]),
		generateAnalysisTable(analyses),
		"",
		"---",
		"",
		`*Generated automatically by Danger.js on ${new Date().toISOString()}*`,
	].join("\n");

	// Write the diagram to file
	writeFileSync(OUTPUT_FILE, content);
	console.log(`✅ Generated codebase diagram: ${OUTPUT_FILE}`);

	return content;
}

// Main Danger.js execution
async function main(): Promise<void> {
	const modifiedFiles = danger.git.modified_files || [];
	const createdFiles = danger.git.created_files || [];
	const allChangedFiles = [...modifiedFiles, ...createdFiles];

	// Check if any TypeScript files in src/ were modified
	const tsFilesChanged = allChangedFiles.some(
		(file) => file.startsWith("src/") && file.endsWith(".ts"),
	);

	// Always generate when running outside Danger context (for testing)
	const shouldGenerate = tsFilesChanged || allChangedFiles.length === 0;

	if (shouldGenerate) {
		console.log(
			"📊 TypeScript files in src/ were modified, generating codebase diagram...",
		);

		try {
			const diagramContent = await generateCodebaseDiagram();

			// Add the diagram to the PR as a markdown comment
			markdown(`## 📊 Updated Codebase Diagram\n\n${diagramContent}`);

			// Suggest reviewing the diagram
			const tsFiles = await getTypeScriptFiles();
			markdown(`
## 🔍 Codebase Analysis

The codebase diagram has been updated to reflect the changes in this PR.
Please review the [${OUTPUT_FILE}](${OUTPUT_FILE}) file to understand the impact of your changes on the overall architecture.

**Key metrics:**
- Total TypeScript files analyzed: ${tsFiles.length}
- Files modified in this PR: ${allChangedFiles.filter((f) => f.startsWith("src/") && f.endsWith(".ts")).length}
      `);
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			warn(`Failed to generate codebase diagram: ${errorMessage}`);
		}
	} else {
		console.log(
			"No TypeScript files in src/ were modified, skipping diagram generation",
		);
	}
}

// ============================================================================
// Module Entry Point
// ============================================================================

// Execute the main function
main().catch((error: unknown) => {
	const errorMessage = error instanceof Error ? error.message : String(error);
	console.error("Error in main function:", errorMessage);
});

// ============================================================================
// Exports
// ============================================================================

export {
	analyzeTypeScriptFile,
	getTypeScriptFiles,
	generateCodebaseDiagram,
	generateComplexityMetricsJSON,
	generateIndividualDiagrams,
	generateOverviewDiagram,
	generateAnalysisTable,
	calculateComplexityMetrics,
};

export type {
	FileAnalysisDetailed,
	ImportInfo,
	ExportedItem,
	ComplexityMetrics,
	ComplexityMetricsOutput,
	DiagramData,
};
