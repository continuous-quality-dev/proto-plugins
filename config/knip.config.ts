import type { KnipConfig } from "knip";

const config: KnipConfig = {
	// Entry points for the application
	entry: [
		// Main source files
		"src/**/*.ts",
		// Configuration files
		"config/**/*.ts",
		// Scripts and tools
		"scripts/**/*.ts",
		// Test files
		"**/*.test.ts",
		"**/*.spec.ts",
		// Package.json scripts
		"package.json",
	],

	// Project files to analyze
	project: [
		"src/**/*.ts",
		"config/**/*.ts",
		"scripts/**/*.ts",
		"**/*.test.ts",
		"**/*.spec.ts",
	],

	// Files and directories to ignore
	ignore: [
		// Dependencies and build outputs
		"node_modules/**",
		"dist/**",
		"build/**",
		"coverage/**",
		".pnpm-store/**",

		// Generated files
		"pnpm-lock.yaml",
		"*.min.js",

		// Temporary files
		"tmp/**",
		"temp/**",

		// IDE and editor files
		".vscode/**",
		".idea/**",
		"*.swp",
		"*.swo",

		// OS files
		".DS_Store",
		"Thumbs.db",
	],

	// Ignore specific patterns for dependencies
	ignoreDependencies: [
		// Runtime-specific dependencies that may not be detected
		"@types/node", // Always needed for Node.js types
		"typescript", // Always needed for TypeScript compilation

		// Build and development tools
		"@typescript-eslint/parser",
		"@typescript-eslint/eslint-plugin",
		"eslint",
		"jiti", // Used by ESLint config

		// Testing frameworks
		"poku", // Cross-runtime testing
		"fast-check", // Property-based testing

		// CI/CD and automation
		"danger", // PR automation

		// Proto toolchain
		"proto", // May not be detected as it's installed via proto itself
	],

	// Plugin configurations for specific tools
	eslint: {
		config: ["config/eslint.config.ts"],
	},

	// TypeScript configuration
	typescript: {
		config: ["tsconfig.json"],
	},
};

export default config;
