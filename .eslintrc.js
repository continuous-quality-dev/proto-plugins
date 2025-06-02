// ESLint configuration for trunk compatibility
// This is a simplified version of our main TypeScript-based configuration

module.exports = {
	root: true,
	env: {
		node: true,
		es2022: true,
	},
	extends: ["eslint:recommended", "@typescript-eslint/recommended"],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: 2022,
		sourceType: "module",
	},
	plugins: ["@typescript-eslint", "import", "promise", "depend"],
	rules: {
		// Essential rules from our main config
		"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
		"@typescript-eslint/no-explicit-any": "warn",
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
				"newlines-between": "never",
				alphabetize: { order: "asc", caseInsensitive: true },
			},
		],
		"promise/catch-or-return": "warn",
		"depend/ban-dependencies": "off",
	},
	ignorePatterns: [
		"node_modules/",
		"dist/",
		"build/",
		"coverage/",
		"*.min.js",
		"pnpm-lock.yaml",
	],
};
