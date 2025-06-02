/**
 * Type definitions for proto plugin scripts
 * Shared types and interfaces used across multiple scripts
 */

// ============================================================================
// GitHub API Types
// ============================================================================

export interface GitHubAsset {
	name: string;
	browser_download_url: string;
	content_type: string;
	size: number;
	download_count: number;
}

export interface GitHubRelease {
	tag_name: string;
	name: string;
	assets: GitHubAsset[];
	body: string;
}

export interface GitHubRepository {
	name: string;
	description: string;
	html_url: string;
	homepage: string;
}

export interface ParsedGitHubUrl {
	owner: string;
	repo: string;
}

// ============================================================================
// Proto Plugin Types
// ============================================================================

export interface PlatformConfig {
	"download-file": string;
	"archive-prefix": string;
	"bin-path": string;
	"checksum-file"?: string;
}

export interface ProtoPlugin {
	name: string;
	type: string;
	description: string;
	platform: Record<string, PlatformConfig>;
	install: {
		"download-url": string;
		arch?: Record<string, string>;
	};
	resolve: {
		"git-url": string;
	};
}

// ============================================================================
// Script-Specific Types
// ============================================================================

export interface PlatformAssets {
	linux: GitHubAsset[];
	macos: GitHubAsset[];
	windows: GitHubAsset[];
}

export interface AnalyzedAssets {
	platforms: PlatformAssets;
	architectures: string[];
}

export interface GenerationOptions {
	interactive: boolean;
	autoSave: boolean;
	outputFile?: string;
}

export interface TestOptions {
	version?: string;
	cleanup?: boolean;
	verbose?: boolean;
}

// ============================================================================
// Runtime Types
// ============================================================================

export interface RuntimeInfo {
	name: string;
	command: string;
}

// ============================================================================
// Proto Plugin Selection Types
// ============================================================================

export interface BaseProtoRegistryEntry {
	id: string;
	locator: string;
	description: string;
	author: string;
}

export interface ProtoRegistryEntry extends BaseProtoRegistryEntry {
	name: string;
	format: "wasm" | "toml";
	homepageUrl: string;
	repositoryUrl: string;
	devicon: string;
	bins: string[];
}

export interface LocalPlugin {
	path: string;
	name: string;
	description: string;
	locator: string;
	author: string;
}

export interface ProtoToolsConfig {
	plugins?: Record<string, string>;
	[key: string]: unknown;
}

export interface CommandLineArgs {
	install?: string[];
	installAllLocal?: boolean;
	interactive?: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface ActTestOptions {
	workflow?: string;
	event?: string;
	dryRun?: boolean;
	verbose?: boolean;
	platform?: string;
	job?: string;
	matrix?: Record<string, string>;
}
