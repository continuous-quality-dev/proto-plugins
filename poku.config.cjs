const { defineConfig } = require("poku");

module.exports = defineConfig({
	include: ["./src"], // Doesn't support glob patterns
	sequential: true,
	debug: false,
	filter: /\.(test.|.spec)\./,
	exclude: [/\.trunk/, /node_modules/], // regex
	failFast: false,
	concurrency: 0, // No limit
	quiet: false,
	envFile: ".env",
	kill: {
		port: [3000],
		range: [
			[3000, 3003],
			[4000, 4002],
		],
		pid: [612],
	},
	deno: {
		allow: ["run", "env", "read", "net"],
		deny: [], // Same as allow
		cjs: [".js", ".cjs"], // specific extensions
		// "cjs": true // all extensions
		// "cjs": false // no polyfill
	},
	beforeEach: () => true, // Before each test file
	afterEach: () => true, // After each test file
});
