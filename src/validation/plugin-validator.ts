/**
 * Plugin validation utilities
 */

import { CONFIG } from "../config/index.ts";
import type { ProtoPlugin } from "../types/types.ts";

export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

export class PluginValidator {
	validate(plugin: ProtoPlugin): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Required fields validation
		if (!plugin.name) {
			errors.push("Plugin name is required");
		}

		if (!plugin.type) {
			errors.push("Plugin type is required");
		}

		if (!plugin.platform) {
			errors.push("Platform configuration is required");
		}

		if (!plugin.install) {
			errors.push("Install configuration is required");
		}

		// Platform validation
		if (plugin.platform) {
			for (const platform of CONFIG.DEFAULTS.platforms) {
				if (!plugin.platform[platform]) {
					warnings.push(`Missing platform configuration for ${platform}`);
					continue;
				}

				const platformConfig = plugin.platform[platform];
				if (!platformConfig["download-file"]) {
					errors.push(`Missing download-file for ${platform}`);
				}

				if (!platformConfig["bin-path"]) {
					errors.push(`Missing bin-path for ${platform}`);
				}
			}
		}

		// Install configuration validation
		if (plugin.install) {
			if (!plugin.install["download-url"]) {
				errors.push("Missing download-url in install configuration");
			}

			// Validate URL template
			if (
				plugin.install["download-url"] &&
				!plugin.install["download-url"].includes("{version}")
			) {
				warnings.push("download-url should include {version} template");
			}
		}

		// Architecture mapping validation
		if (plugin.install?.arch) {
			const supportedArchs = Object.keys(CONFIG.DEFAULTS.archMapping);
			const pluginArchs = Object.keys(plugin.install.arch);

			for (const arch of supportedArchs) {
				if (!pluginArchs.includes(arch)) {
					warnings.push(`Missing architecture mapping for ${arch}`);
				}
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	validateUrl(url: string): boolean {
		try {
			const parsed = new URL(url);
			return parsed.protocol === "https:" && parsed.hostname === "github.com";
		} catch {
			return false;
		}
	}

	validateVersion(version: string): boolean {
		// Basic semver validation
		const semverRegex = /^v?\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/;
		return semverRegex.test(version);
	}
}
