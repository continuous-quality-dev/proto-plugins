/**
 * Application constants
 */

export const SUPPORTED_RUNTIMES = ["node", "bun", "deno"] as const;
export const SUPPORTED_PLATFORMS = ["linux", "macos", "windows"] as const;
export const SUPPORTED_ARCHITECTURES = ["x86_64", "aarch64"] as const;

export const GITHUB_URL_REGEX =
	/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/.*)?$/;
export const SEMVER_REGEX = /^v?\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/;

export const DEFAULT_ARCH_MAPPING = {
	x86_64: "amd64",
	aarch64: "arm64",
} as const;

export const PLATFORM_EXTENSIONS = {
	linux: "",
	macos: "",
	windows: ".exe",
} as const;

export const COMMON_BINARY_PATTERNS = [
	"{name}-{version}-{platform}-{arch}",
	"{name}_{version}_{platform}_{arch}",
	"{name}-v{version}-{platform}-{arch}",
	"{name}_v{version}_{platform}_{arch}",
] as const;

export const ARCHIVE_EXTENSIONS = [
	".tar.gz",
	".tar.xz",
	".tar.bz2",
	".zip",
	".7z",
] as const;

export const EXECUTABLE_EXTENSIONS = [
	".exe",
	".msi",
	".dmg",
	".pkg",
	".deb",
	".rpm",
	".AppImage",
] as const;

export const TEST_TIMEOUTS = {
	short: 5000,
	medium: 15000,
	long: 30000,
	extended: 60000,
} as const;

export const EXIT_CODES = {
	SUCCESS: 0,
	GENERAL_ERROR: 1,
	INVALID_USAGE: 2,
	NETWORK_ERROR: 3,
	FILE_ERROR: 4,
	VALIDATION_ERROR: 5,
	PROTO_ERROR: 6,
} as const;

export const LOG_LEVELS = {
	ERROR: 0,
	WARN: 1,
	INFO: 2,
	DEBUG: 3,
	TRACE: 4,
} as const;
