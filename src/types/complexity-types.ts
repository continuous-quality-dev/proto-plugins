/**
 * TypeScript types for complexity metrics and comparison functionality
 */

// ============================================================================
// Base Complexity Metrics Types
// ============================================================================

export interface ComplexityDistribution {
	high: number;
	medium: number;
	low: number;
}

export interface FileMetrics {
	averageCyclomaticComplexity: string;
	totalEstimatedLOC?: number;
	highComplexityFunctions: number;
	mediumComplexityFunctions?: number;
	lowComplexityFunctions?: number;
}

export interface FileComplexityData {
	path?: string;
	functionCount: number;
	dependencies?: string[];
	exports?: unknown[];
	functions?: Record<string, unknown>;
	metrics: FileMetrics;
}

export interface ProjectMetrics {
	averageCyclomaticComplexity: string;
	totalEstimatedLOC?: number;
	complexityDistribution: ComplexityDistribution;
}

export interface ComplexityMetadata {
	generatedAt?: string;
	totalFiles: number;
	totalFunctions: number;
}

export interface ComplexityMetricsData {
	metadata: ComplexityMetadata;
	projectMetrics: ProjectMetrics;
	files: Record<string, FileComplexityData>;
}

// ============================================================================
// Comparison Types
// ============================================================================

export interface MetricChange<T = number> {
	base?: T;
	current?: T;
	change: T;
}

export interface FileChange {
	status: "added" | "deleted" | "modified";
	functionCount: MetricChange;
	averageComplexity: MetricChange;
	highComplexityFunctions: MetricChange;
}

export interface SummaryChanges {
	totalFiles: MetricChange;
	totalFunctions: MetricChange;
	averageComplexity: MetricChange;
	complexityDistribution: {
		high: MetricChange;
		medium: MetricChange;
		low: MetricChange;
	};
}

export interface MetricsDiff {
	summary: SummaryChanges;
	files: Record<string, FileChange>;
}

// ============================================================================
// Function Types
// ============================================================================

export type CalculateMetricsDiffFunction = (
	baseMetrics: ComplexityMetricsData | null,
	currentMetrics: ComplexityMetricsData | null,
) => MetricsDiff;

export type GenerateComparisonMarkdownFunction = (
	diff: MetricsDiff,
	changedFiles?: string[],
) => string;

// ============================================================================
// Test Data Types
// ============================================================================

export interface MockComplexityMetrics {
	metadata: {
		totalFiles: number;
		totalFunctions: number;
	};
	projectMetrics: {
		averageCyclomaticComplexity: string;
		complexityDistribution: {
			high: number;
			medium: number;
			low: number;
		};
	};
	files: Record<
		string,
		{
			functionCount: number;
			metrics: {
				averageCyclomaticComplexity: string;
				highComplexityFunctions: number;
			};
		}
	>;
}

// ============================================================================
// Test Function Types
// ============================================================================

export type TestFunction = () => void;
export type TestRunner = () => void;

// ============================================================================
// Diagram Generation Types
// ============================================================================

export interface ExportInfo {
	name: string;
	type: "function" | "const" | "class" | "interface" | "type";
}

export interface FileAnalysis {
	fileName: string;
	functions: string[];
	dependencies: string[];
	exports: ExportInfo[];
}

export interface DiagramGenerationOptions {
	includeTypes?: boolean;
	includeFunctions?: boolean;
	includeDependencies?: boolean;
}

// ============================================================================
// Dangerfile Types
// ============================================================================

export interface ImportInfo {
	name: string;
	from: string;
	type: "named" | "default";
}

export interface ExportedItem {
	name: string;
	type: "function" | "variable" | "default";
}

export interface FileAnalysisDetailed {
	fileName: string;
	filePath: string;
	imports: ImportInfo[];
	exports: ExportedItem[];
	functions: string[];
	dependencies: string[];
}

export interface ComplexityMetrics {
	complexity: string;
	cyclomatic: number;
	loc: number;
	params: number;
	description: string;
}

export interface FunctionComplexityData {
	complexity: string;
	cyclomaticComplexity: number;
	estimatedLOC: number;
	parameterCount: number;
	description: string;
	complexityLevel: "high" | "medium" | "low";
}

export interface FileComplexityMetrics {
	averageCyclomaticComplexity: string;
	totalEstimatedLOC: number;
	highComplexityFunctions: number;
	mediumComplexityFunctions: number;
	lowComplexityFunctions: number;
}

export interface DangerFileComplexityData {
	path: string;
	functionCount: number;
	dependencies: string[];
	exports: ExportedItem[];
	functions: Record<string, FunctionComplexityData>;
	metrics: FileComplexityMetrics;
}

export interface ProjectComplexityMetrics {
	averageCyclomaticComplexity: string;
	totalEstimatedLOC: number;
	complexityDistribution: {
		high: number;
		medium: number;
		low: number;
	};
	mostComplexFunctions: Array<{
		file: string;
		function: string;
		cyclomaticComplexity: number;
		complexityLevel: string;
		estimatedLOC: number;
	}>;
}

export interface ComplexityMetricsOutput {
	metadata: {
		generatedAt: string;
		totalFiles: number;
		totalFunctions: number;
	};
	files: Record<string, DangerFileComplexityData>;
	projectMetrics: ProjectComplexityMetrics;
}

export interface DiagramData {
	fileName: string;
	diagram: string;
}

// Danger.js types
export interface DangerGit {
	modified_files: string[];
	created_files: string[];
}

export interface DangerContext {
	git: DangerGit;
}

export type MarkdownFunction = (text: string) => void;
export type WarnFunction = (text: string) => void;

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
