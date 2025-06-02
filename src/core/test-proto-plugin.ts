// Runtime-agnostic proto plugin installer/tester using async/await
const PLUGINS_DIR = "../proto-plugins/plugins";
const VERSION = "latest";

// Helper to detect runtime (for testability)
export function getRuntime() {
	if (typeof globalThis.Bun !== "undefined") return "bun";
	if (typeof globalThis.Deno !== "undefined") return "deno";
	if (
		typeof process !== "undefined" &&
		process.versions &&
		process.versions.node
	) {
		return "node";
	}
	return "unsupported";
}

// Helper to run a shell command in a runtime-agnostic way
export async function runCommand(
	cmd: string,
	runtime: string = getRuntime(),
): Promise<{ success: boolean; stdout: string; stderr: string }> {
	if (runtime === "bun") {
		const { stdout, stderr, success } = await Bun.$`${cmd}`;
		return {
			success,
			stdout: await stdout.text(),
			stderr: await stderr.text(),
		};
	}

	if (runtime === "deno") {
		const p = Deno.run({
			cmd: cmd.split(" "),
			stdout: "piped",
			stderr: "piped",
		});
		const [status, stdout, stderr] = await Promise.all([
			p.status(),
			p.output(),
			p.stderrOutput(),
		]);
		p.close();
		return {
			success: status.success,
			stdout: new TextDecoder().decode(stdout),
			stderr: new TextDecoder().decode(stderr),
		};
	}

	if (runtime === "node") {
		const { exec } = await import("node:child_process");
		return new Promise((resolve) => {
			exec(cmd, (error, stdout, stderr) => {
				resolve({
					success: !error,
					stdout: stdout?.toString() || "",
					stderr: stderr?.toString() || "",
				});
			});
		});
	}

	throw new Error("Unsupported runtime");
}

// Helper to read available tools from plugins directory
export async function getAvailableTools(
	runtime: string = getRuntime(),
): Promise<string[]> {
	if (runtime === "bun" || runtime === "node") {
		const { readdir } = await import("node:fs/promises");
		const files = await readdir(PLUGINS_DIR);
		return files
			.filter((f: string) => f.endsWith(".json") && !f.endsWith("-auto.json"))
			.map((f: string) => f.replace(/\.json$/, ""));
	}

	if (runtime === "deno") {
		const files: string[] = [];
		for await (const entry of Deno.readDir(PLUGINS_DIR)) {
			if (
				entry.isFile &&
				entry.name.endsWith(".json") &&
				!entry.name.endsWith("-auto.json")
			) {
				files.push(entry.name.replace(/\.json$/, ""));
			}
		}
		return files;
	}

	throw new Error("Unsupported runtime");
}

// Helper to prompt user for tool selection
export async function promptUser(
	tools: string[],
	runtime: string = getRuntime(),
): Promise<string[]> {
	const promptMsg = `Select tool(s) to install and test (comma separated):
${tools.map((t, i) => `${i + 1}. ${t}`).join("\n")}
> `;
	if (runtime === "bun" || runtime === "node") {
		const readline = await import("node:readline");
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		return new Promise((resolve) => {
			rl.question(promptMsg, (answer: string) => {
				rl.close();
				const indices = answer
					.split(",")
					.map((x) => x.trim())
					.filter(Boolean)
					.map((x) => Number.parseInt(x, 10) - 1)
					.filter((i) => i >= 0 && i < tools.length);
				resolve(indices.map((i) => tools[i]));
			});
		});
	}
	if (runtime === "deno") {
		const answer = prompt(promptMsg);
		if (!answer) return [];
		const indices = answer
			.split(",")
			.map((x) => x.trim())
			.filter(Boolean)
			.map((x) => Number.parseInt(x, 10) - 1)
			.filter((i) => i >= 0 && i < tools.length);
		return indices.map((i) => tools[i]);
	}
	throw new Error("Unsupported runtime");
}

export async function installTool(
	tool: string,
	version = "latest",
	runCommandImpl = runCommand,
) {
	const cmd = `proto install ${tool} ${version}`;
	const result = await runCommandImpl(cmd);
	console.log(
		`[install] ${tool} success: ${result.success}\n${result.stdout}\n${result.stderr}`,
	);
	return result.success;
}

export async function validateTool(tool: string, runCommandImpl = runCommand) {
	// Try to get the version using common CLI flags
	const versionFlags = ["--version", "-v", "version"];
	let versionResult = null;

	for (const flag of versionFlags) {
		const cmd = `proto run ${tool} -- ${flag}`;
		versionResult = await runCommandImpl(cmd);
		// If we get output and no error, break
		if (versionResult.success && versionResult.stdout.trim()) {
			break;
		}
	}

	if (versionResult?.success) {
		console.log(
			`[validate] ${tool} version:\n${versionResult.stdout}\n${versionResult.stderr}`,
		);
		return true;
	}

	console.log(
		`[validate] ${tool} version check failed.\n${
			versionResult ? versionResult.stderr : ""
		}`,
	);
	return false;
}

async function main() {
	const runtime = getRuntime();
	// 1. Parse CLI args
	let tools: string[] = [];
	if (runtime === "node" || runtime === "bun") {
		if (typeof process !== "undefined" && process.argv) {
			tools = process.argv.slice(2);
		}
	}
	if (runtime === "deno") {
		if (typeof globalThis.Deno !== "undefined" && Deno.args) {
			tools = Deno.args;
		}
	}
	// 2. If no tools provided, prompt user
	if (!tools.length) {
		const available = await getAvailableTools(runtime);
		if (!available.length) {
			console.error("No tools found in plugins directory.");
			return;
		}
		tools = await promptUser(available, runtime);
		if (!tools.length) {
			console.error("No tools selected.");
			return;
		}
	}
	// 3. Install and validate each tool
	for (const tool of tools) {
		const installed = await installTool(tool, VERSION, (cmd) =>
			runCommand(cmd, runtime),
		);
		if (!installed) {
			console.error(`Failed to install tool: ${tool}`);
			continue;
		}
		const validated = await validateTool(tool, (cmd) =>
			runCommand(cmd, runtime),
		);
		if (!validated) {
			console.error(`Tool validation failed: ${tool}`);
		}
	}
}

// Export main function for testing, but don't auto-run
export { main };
