/**
 * Centralized configuration management
 */

export const CONFIG = {
	// Repository configuration
	REPO: {
		owner: "continuous-quality-dev",
		repo: "proto-plugins",
		branch: "main",
	},

	// File paths
	PATHS: {
		plugins: "plugins",
		prototools: ".prototools",
		actrc: ".actrc",
		workflows: ".github/workflows",
	},

	// Default values
	DEFAULTS: {
		toolType: "cli",
		archMapping: {
			aarch64: "arm64",
			x86_64: "amd64",
		},
		platforms: ["linux", "macos", "windows"] as const,
	},

	// Test configuration
	TEST: {
		timeout: 30000,
		retries: 3,
		platforms: ["ubuntu-latest", "macos-latest", "windows-latest"] as const,
	},

	// GitHub API
	GITHUB: {
		apiUrl: "https://api.github.com",
		rateLimit: 5000,
	},

	// Act configuration
	ACT: {
		platforms: {
			"ubuntu-latest": "catthehacker/ubuntu:act-latest",
			"ubuntu-22.04": "catthehacker/ubuntu:act-22.04",
			"ubuntu-20.04": "catthehacker/ubuntu:act-20.04",
			"macos-latest": "catthehacker/ubuntu:act-latest",
			"macos-12": "catthehacker/ubuntu:act-latest",
			"windows-latest": "catthehacker/ubuntu:act-latest",
			"windows-2022": "catthehacker/ubuntu:act-latest",
		},
		containerArchitecture: "linux/amd64",
		artifactServerPath: "/tmp/artifacts",
	},
} as const;

export type Config = typeof CONFIG;
export type Platform = (typeof CONFIG.DEFAULTS.platforms)[number];
export type TestPlatform = (typeof CONFIG.TEST.platforms)[number];
