/**
 * Proto CLI service
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { CONFIG } from "../config/index.ts";
import type { ProtoToolsConfig } from "../types/types.ts";

export class ProtoService {
	private readonly protoHome =
		process.env.PROTO_HOME || join(homedir(), ".proto");

	checkInstalled(): boolean {
		try {
			execSync("proto --version", { stdio: "pipe" });
			return true;
		} catch {
			return false;
		}
	}

	getVersion(): string {
		try {
			const output = execSync("proto --version", { encoding: "utf8" });
			return output.trim();
		} catch (error) {
			throw new Error("Failed to get proto version");
		}
	}

	getToolsDir(): string {
		return join(this.protoHome, "tools");
	}

	getPluginsDir(): string {
		return join(this.protoHome, "plugins");
	}

	loadConfig(): ProtoToolsConfig | null {
		const configPath = join(process.cwd(), CONFIG.PATHS.prototools);

		if (!existsSync(configPath)) {
			return null;
		}

		try {
			const content = readFileSync(configPath, "utf8");
			return JSON.parse(content);
		} catch (error) {
			throw new Error(`Failed to parse .prototools: ${error}`);
		}
	}

	async installTool(name: string, version?: string): Promise<void> {
		const versionArg = version ? `@${version}` : "";
		const command = `proto install ${name}${versionArg}`;

		try {
			execSync(command, { stdio: "inherit" });
		} catch (error) {
			throw new Error(`Failed to install ${name}: ${error}`);
		}
	}

	async runTool(name: string, args: string[] = []): Promise<string> {
		const command = `proto run ${name} ${args.join(" ")}`;

		try {
			return execSync(command, { encoding: "utf8" });
		} catch (error) {
			throw new Error(`Failed to run ${name}: ${error}`);
		}
	}

	listInstalledTools(): string[] {
		try {
			const output = execSync("proto list", { encoding: "utf8" });
			return output
				.split("\n")
				.filter((line) => line.trim())
				.map((line) => line.split(" ")[0]);
		} catch (error) {
			throw new Error(`Failed to list tools: ${error}`);
		}
	}
}
