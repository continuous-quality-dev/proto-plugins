import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import type { Linter } from "eslint";
import dependPlugin from "eslint-plugin-depend";
import importPlugin from "eslint-plugin-import";
import nodePlugin from "eslint-plugin-n";
import promisePlugin from "eslint-plugin-promise";

const config: Linter.Config[] = [
	// Base JavaScript configuration
	js.configs.recommended,

	// Global ignores
	{
		ignores: [
			"node_modules/**",
			"dist/**",
			"build/**",
			"*.min.js",
			"coverage/**",
			".pnpm-store/**",
			"pnpm-lock.yaml",
		],
	},

	// TypeScript files configuration
	{
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
			},
			globals: {
				// Node.js globals
				console: "readonly",
				process: "readonly",
				global: "readonly",
				Buffer: "readonly",
				__dirname: "readonly",
				__filename: "readonly",

				// Browser/Web APIs
				fetch: "readonly",
				Response: "readonly",
				URL: "readonly",
				TextDecoder: "readonly",
				prompt: "readonly",

				// Runtime-specific globals
				Deno: "readonly",
				Bun: "readonly",
			},
		},
		plugins: {
			"@typescript-eslint": tseslint,
			depend: dependPlugin,
			import: importPlugin,
			n: nodePlugin,
			promise: promisePlugin,
		},
		rules: {
			// TypeScript-specific rules
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-var-requires": "error",
			"@typescript-eslint/explicit-function-return-type": "off",
			"@typescript-eslint/explicit-module-boundary-types": "off",
			"@typescript-eslint/no-non-null-assertion": "warn",

			// Import rules (relaxed for better developer experience)
			"import/order": [
				"warn",
				{
					groups: [
						"builtin",
						"external",
						"internal",
						"parent",
						"sibling",
						"index",
					],
					"newlines-between": "always",
				},
			],
			"import/no-unresolved": "off", // TypeScript handles this
			"import/no-duplicates": "error",

			// Node.js rules
			"n/no-missing-import": "off", // TypeScript handles this
			"n/no-unsupported-features/es-syntax": "off", // We use modern syntax

			// Promise rules (relaxed for test files)
			"promise/always-return": "off", // Too strict for our use case
			"promise/catch-or-return": "warn",
			"promise/param-names": "error",
			"promise/no-return-wrap": "error",

			// Dependency management rules
			"depend/ban-dependencies": "off", // We'll configure this as needed when we want to ban specific dependencies

			// General rules
			"no-console": "off", // We use console and consola for logging
			"no-unused-vars": "off", // Use TypeScript version instead
			"prefer-const": "error",
			"no-var": "error",
			"no-useless-escape": "warn", // Warn instead of error for regex patterns
		},
	},

	// JavaScript files configuration
	{
		files: ["**/*.js", "**/*.mjs"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				console: "readonly",
				process: "readonly",
				global: "readonly",
				Buffer: "readonly",
				__dirname: "readonly",
				__filename: "readonly",
				fetch: "readonly",
				Response: "readonly",
				URL: "readonly",
				TextDecoder: "readonly",
			},
		},
		plugins: {
			depend: dependPlugin,
			import: importPlugin,
			n: nodePlugin,
			promise: promisePlugin,
		},
		rules: {
			// Import rules
			"import/order": [
				"warn",
				{
					groups: [
						"builtin",
						"external",
						"internal",
						"parent",
						"sibling",
						"index",
					],
					"newlines-between": "always",
				},
			],
			"import/no-duplicates": "error",

			// Node.js rules
			"n/no-missing-import": "error",

			// Promise rules
			"promise/catch-or-return": "warn",
			"promise/param-names": "error",
			"promise/no-return-wrap": "error",

			// Dependency management rules
			"depend/ban-dependencies": "off",

			// General rules
			"no-console": "off",
			"no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
			"prefer-const": "error",
			"no-var": "error",
		},
	},

	// CommonJS files configuration
	{
		files: ["**/*.cjs"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "commonjs",
			globals: {
				require: "readonly",
				module: "readonly",
				exports: "writable",
				__dirname: "readonly",
				__filename: "readonly",
				global: "readonly",
				process: "readonly",
				console: "readonly",
			},
		},
		plugins: {
			depend: dependPlugin,
			import: importPlugin,
			n: nodePlugin,
			promise: promisePlugin,
		},
		rules: {
			"promise/catch-or-return": "warn",
			"promise/param-names": "error",
			"promise/no-return-wrap": "error",
			"depend/ban-dependencies": "off",
			"no-console": "off",
			"no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
			"prefer-const": "error",
			"no-var": "error",
		},
	},

	// Test files configuration (more relaxed rules)
	{
		files: ["**/*.test.ts", "**/*.test.js", "**/*.spec.ts", "**/*.spec.js"],
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
			"promise/always-return": "off",
			"no-console": "off",
			"import/order": "warn", // Relaxed for test files
		},
	},
];

export default config;
