// utils.ts
import { execSync } from "child_process";
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "fs";
import { homedir } from "os";
import { basename, dirname, join } from "path";

// Argument parsing
export function parseArgs(args: string[]): {
	options: TestOptions;
	pluginPath: string;
} {
	const options: TestOptions = {
		cleanup: true,
		verbose: false,
	};

	let pluginPath = "";

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === "--version" || arg === "-v") {
			options.version = args[++i];
		} else if (arg === "--no-cleanup") {
			options.cleanup = false;
		} else if (arg === "--verbose") {
			options.verbose = true;
		} else if (arg === "--help" || arg === "-h") {
			console.log(`
Usage: node --experimental-strip-types scripts/test-proto-plugin-with-proto.ts [options] <plugin-json-file>

Options:
  --version, -v <version>    Test specific version (default: latest)
  --no-cleanup              Don't clean up installed tools and plugins
  --verbose                 Show detailed output
  --help, -h                Show this help message

Examples:
  # Test with latest version
  node --experimental-strip-types scripts/test-proto-plugin-with-proto.ts plugins/d2.json

  # Test specific version
  node --experimental-strip-types scripts/test-proto-plugin-with-proto.ts --version 0.7.0 plugins/d2.json

  # Keep tools installed for inspection
  node --experimental-strip-types scripts/test-proto-plugin-with-proto.ts --no-cleanup plugins/d2.json
`);
			process.exit(0);
		} else if (!pluginPath && arg.endsWith(".json")) {
			pluginPath = arg;
		}
	}

	if (!pluginPath) {
		throw new Error("Plugin JSON file is required");
	}

	return { options, pluginPath };
}

// Proto CLI utilities
export function checkProtoInstalled(): void {
	try {
		execSync("proto --version", { stdio: "pipe" });
		console.log("✅ Proto is installed and available");
	} catch (error) {
		throw new Error(
			"Proto is not installed or not in PATH. Please install proto first: https://moonrepo.dev/proto",
		);
	}
}

export function getProtoToolsDir(): string {
	const protoHome = process.env.PROTO_HOME || join(homedir(), ".proto");
	return join(protoHome, "tools");
}

export function installPluginToProto(
	pluginPath: string,
	pluginName: string,
): string {
	const protoHome = process.env.PROTO_HOME || join(homedir(), ".proto");
	const pluginsDir = join(protoHome, "plugins");
	const targetPath = join(pluginsDir, `${pluginName}.json`);

	console.log(`📦 Installing plugin to proto: ${targetPath}`);

	// Create plugins directory if it doesn't exist
	mkdirSync(pluginsDir, { recursive: true });

	// Copy the plugin file
	copyFileSync(pluginPath, targetPath);

	console.log(`✅ Plugin installed to: ${targetPath}`);
	return targetPath;
}

export function installToolWithProto(toolName: string, version?: string): void {
	const command = version
		? `proto install ${toolName} ${version}`
		: `proto install ${toolName}`;

	console.log(`🔧 Installing tool: ${command}`);

	try {
		const output = execSync(command, {
			encoding: "utf8",
			stdio: "pipe",
		});

		if (output) {
			console.log(`📄 Install output:\n${output}`);
		}

		const versionDisplay = version ? ` ${version}` : "";
		console.log(`✅ Tool ${toolName}${versionDisplay} installed successfully`);
	} catch (error) {
		throw new Error(
			`Failed to install ${toolName}: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

export function testToolWithProto(
	toolName: string,
	version?: string,
): { version?: string; success: boolean; output: string } {
	console.log(`🧪 Testing tool: ${toolName}`);

	// Pin the version if provided to make proto run work
	if (version) {
		try {
			console.log(`  Pinning version: proto pin ${toolName} ${version}`);
			execSync(`proto pin ${toolName} ${version}`, { stdio: "pipe" });
		} catch (error) {
			console.log(
				`    Could not pin version: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}

	// Try to make binaries executable (fix permission issues)
	try {
		const toolsDir = getProtoToolsDir();
		const toolDir = join(toolsDir, toolName);
		if (version) {
			const versionDir = join(toolDir, version);
			execSync(
				`find "${versionDir}" -type f -name "${toolName}" -exec chmod +x {} \\; 2>/dev/null || true`,
				{ stdio: "pipe" },
			);
		}
	} catch (error) {
		// Ignore errors - this is just a best effort
	}

	// Try common version flags using proto run
	const versionFlags = ["--version", "-v", "version"];

	for (const flag of versionFlags) {
		try {
			console.log(`  Trying: proto run ${toolName} -- ${flag}`);
			const output = execSync(`proto run ${toolName} -- ${flag}`, {
				encoding: "utf8",
				timeout: 15000,
				stdio: "pipe",
			});

			// Look for version patterns in output
			const versionMatch = output.match(/v?(\d+\.\d+\.\d+[^\s]*)/);
			if (versionMatch) {
				return {
					version: versionMatch[1],
					success: true,
					output: output.trim(),
				};
			}

			return {
				success: true,
				output: output.trim(),
			};
		} catch (error) {
			console.log(
				`    Failed with ${flag}: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
			continue;
		}
	}

	// Try just running the tool without arguments
	try {
		console.log(`  Trying: proto run ${toolName}`);
		const output = execSync(`proto run ${toolName}`, {
			encoding: "utf8",
			timeout: 10000,
			stdio: "pipe",
		});

		return {
			success: true,
			output: output.trim(),
		};
	} catch (error) {
		// This might be expected if the tool requires arguments
		console.log(
			`    Tool execution without args failed (this might be normal)`,
		);
	}

	return {
		success: false,
		output: "All test commands failed",
	};
}

export function getInstalledVersion(toolName: string): string | null {
	try {
		const output = execSync(`proto list ${toolName}`, {
			encoding: "utf8",
			stdio: "pipe",
		});

		// Parse the output to find installed versions
		const lines = output.split("\n");
		for (const line of lines) {
			if (line.includes("✓") || line.includes("*")) {
				const versionMatch = line.match(/(\d+\.\d+\.\d+[^\s]*)/);
				if (versionMatch) {
					return versionMatch[1];
				}
			}
		}
	} catch (error) {
		console.log("Could not get installed version");
	}

	return null;
}

export async function fetchLatestVersion(gitUrl: string): Promise<string> {
	const match = gitUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
	if (!match) {
		throw new Error(
			"Only GitHub repositories are supported for version fetching",
		);
	}

	const [, owner, repo] = match;
	const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

	try {
		const response = await fetch(apiUrl);
		if (!response.ok) {
			throw new Error(`GitHub API error: ${response.status}`);
		}

		const release = (await response.json()) as { tag_name: string };
		return release.tag_name.replace(/^v/, ""); // Remove 'v' prefix if present
	} catch (error) {
		throw new Error(
			`Failed to fetch latest version: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

// Act CLI utilities
export async function checkActInstallation(): Promise<boolean> {
	try {
		// First try direct act command
		await execSync("act --version", { stdio: "pipe" });
		return true;
	} catch (error) {
		// Try with proto
		try {
			await execSync("proto run act -- --version", { stdio: "pipe" });
			return true;
		} catch (protoError) {
			return false;
		}
	}
}

export function installActWithProto(): boolean {
	console.log("📦 Installing act CLI with proto...");

	try {
		execSync("proto install act", { stdio: "inherit" });
		console.log("✅ Act CLI installed successfully with proto");
		return true;
	} catch (error) {
		console.log("❌ Failed to install act with proto");
		return false;
	}
}

export function getActCommand(): string {
	// Check if act is available directly
	try {
		execSync("act --version", { stdio: "pipe" });
		return "act";
	} catch (error) {
		// Use proto run
		return "proto run act --";
	}
}

export function createActConfig(): void {
	const actrcPath = ".actrc";
	const actrcContent = `# Act configuration for proto-plugins testing
--platform ubuntu-latest=catthehacker/ubuntu:act-latest
--platform ubuntu-22.04=catthehacker/ubuntu:act-22.04
--platform ubuntu-20.04=catthehacker/ubuntu:act-20.04
--platform macos-latest=catthehacker/ubuntu:act-latest
--platform macos-12=catthehacker/ubuntu:act-latest
--platform windows-latest=catthehacker/ubuntu:act-latest
--platform windows-2022=catthehacker/ubuntu:act-latest
--container-architecture linux/amd64
--artifact-server-path /tmp/artifacts
`;

	if (!existsSync(actrcPath)) {
		writeFileSync(actrcPath, actrcContent);
		console.log("✅ Created .actrc configuration file");
	}
}

export function createSecretsFile(): string {
	const secretsPath = ".act-secrets";
	const secretsContent = `GITHUB_TOKEN=ghp_fake_token_for_local_testing
NODE_VERSION=22.6.0
`;

	if (!existsSync(secretsPath)) {
		writeFileSync(secretsPath, secretsContent);
		console.log("✅ Created .act-secrets file");
	}

	return secretsPath;
}

export function createEventFile(
	event: string,
	inputs?: Record<string, any>,
): string {
	const eventPath = ".act-event.json";

	let eventData: any = {};

	switch (event) {
		case "workflow_dispatch":
			eventData = {
				inputs: inputs || {},
			};
			break;
		case "push":
			eventData = {
				ref: "refs/heads/feat/grit",
				repository: {
					name: "proto-plugins",
					full_name: "continuous-quality-dev/proto-plugins",
				},
			};
			break;
		case "pull_request":
			eventData = {
				action: "opened",
				pull_request: {
					head: {
						ref: "feat/test-workflows",
					},
					base: {
						ref: "main",
					},
				},
			};
			break;
		default:
			eventData = {};
	}

	writeFileSync(eventPath, JSON.stringify(eventData, null, 2));
	console.log(`✅ Created event file for ${event}`);

	return eventPath;
}

export function getAvailableWorkflows(): string[] {
	const workflowsDir = ".github/workflows";
	if (!existsSync(workflowsDir)) {
		return [];
	}

	try {
		const files = execSync(
			`find ${workflowsDir} -name "*.yml" -o -name "*.yaml"`,
			{
				encoding: "utf8",
			},
		)
			.trim()
			.split("\n")
			.filter((f) => f);

		return files.map((f) => f.replace(`${workflowsDir}/`, ""));
	} catch (error) {
		return [];
	}
}

export function runActCommand(options: ActTestOptions): void {
	const {
		workflow = "test-plugins.yml",
		event = "workflow_dispatch",
		dryRun = false,
		verbose = false,
		platform = "ubuntu-latest",
		job,
		matrix,
	} = options;

	console.log(`🚀 Testing workflow: ${workflow}`);
	console.log(`📅 Event: ${event}`);
	console.log(`🖥️  Platform: ${platform}`);

	if (job) console.log(`🎯 Job: ${job}`);
	if (matrix) console.log(`🔢 Matrix: ${matrix}`);

	// Create necessary files
	createActConfig();
	const secretsFile = createSecretsFile();

	// Create event file with inputs for workflow_dispatch
	let eventInputs = {};
	if (event === "workflow_dispatch") {
		if (workflow.includes("test-single-plugin")) {
			eventInputs = {
				plugin_file: "plugins/d2.json",
				test_os: "ubuntu-latest",
				specific_version: "",
			};
		} else if (workflow.includes("batch-test")) {
			eventInputs = {
				os: "ubuntu-latest",
				plugin_pattern: "d2-auto.json",
				timeout_minutes: "5",
			};
		} else if (workflow.includes("test-plugins")) {
			eventInputs = {
				plugin_pattern: "d2-auto.json",
			};
		}
	}

	const eventFile = createEventFile(event, eventInputs);

	// Build act command
	const actArgs = [
		event,
		"--workflows",
		`.github/workflows/${workflow}`,
		"--secret-file",
		secretsFile,
		"--eventpath",
		eventFile,
		"--platform",
		`${platform}=catthehacker/ubuntu:act-latest`,
	];

	if (dryRun) {
		actArgs.push("--dryrun");
	}

	if (verbose) {
		actArgs.push("--verbose");
	}

	if (job) {
		actArgs.push("--job", job);
	}

	if (matrix) {
		actArgs.push("--matrix", matrix);
	}

	// Add environment variables
	actArgs.push("--env", "NODE_VERSION=22.6.0");
	actArgs.push("--env", "CI=true");

	// Get the appropriate act command
	const actCommand = getActCommand();
	const isProtoCommand = actCommand.includes("proto");

	console.log("\n🔧 Act command:");
	if (isProtoCommand) {
		console.log(`${actCommand} ${actArgs.join(" ")}`);
	} else {
		console.log(`${actCommand} ${actArgs.join(" ")}`);
	}
	console.log("");

	if (dryRun) {
		console.log("🔍 Dry run mode - showing what would be executed");
	}

	try {
		// Run act command
		let actProcess;
		if (isProtoCommand) {
			// For proto run act, we need to handle the command differently
			const protoArgs = ["run", "act", "--", ...actArgs];
			actProcess = spawn("proto", protoArgs, {
				stdio: "inherit",
				cwd: process.cwd(),
			});
		} else {
			actProcess = spawn("act", actArgs, {
				stdio: "inherit",
				cwd: process.cwd(),
			});
		}

		actProcess.on("close", (code) => {
			console.log(`\n🏁 Act process exited with code: ${code}`);

			// Cleanup
			try {
				if (existsSync(eventFile)) {
					execSync(`rm ${eventFile}`);
				}
			} catch (error) {
				// Ignore cleanup errors
			}

			if (code === 0) {
				console.log("✅ Workflow test completed successfully!");
			} else {
				console.log("❌ Workflow test failed");
				process.exit(code || 1);
			}
		});

		actProcess.on("error", (error) => {
			console.error("❌ Failed to start act process:", error.message);
			process.exit(1);
		});
	} catch (error) {
		console.error(
			"❌ Error running act:",
			error instanceof Error ? error.message : String(error),
		);
		process.exit(1);
	}
}

export function showUsage(): void {
	console.log("🧪 GitHub Workflows Local Testing with Act");
	console.log("");
	console.log("Usage:");
	console.log("  npm run test-workflows [workflow] [options]");
	console.log("");
	console.log("Examples:");
	console.log(
		"  npm run test-workflows                           # Test main workflow",
	);
	console.log(
		"  npm run test-workflows test-single-plugin.yml   # Test specific workflow",
	);
	console.log(
		"  npm run test-workflows -- --dry-run             # Dry run mode",
	);
	console.log(
		"  npm run test-workflows -- --verbose             # Verbose output",
	);
	console.log(
		"  npm run test-workflows -- --job detect-plugins  # Test specific job",
	);
	console.log("");
	console.log("Available workflows:");
	const workflows = getAvailableWorkflows();
	workflows.forEach((w) => console.log(`  - ${w}`));
	console.log("");
	console.log("Options:");
	console.log("  --workflow <name>     Workflow file to test");
	console.log(
		"  --event <type>        Event type (workflow_dispatch, push, pull_request)",
	);
	console.log(
		"  --dry-run             Show what would be executed without running",
	);
	console.log("  --verbose             Enable verbose output");
	console.log("  --job <name>          Test specific job only");
	console.log(
		"  --platform <name>     Platform to use (ubuntu-latest, macos-latest, etc.)",
	);
	console.log("  --skip-validation     Skip Trunk workflow validation");
	console.log("  --help                Show this help message");
}

export function validateWorkflowsWithTrunk(): boolean {
	console.log("🔍 Validating workflows with Trunk...");

	try {
		execSync("trunk check .github/workflows/", { stdio: "inherit" });
		console.log("✅ Trunk validation passed");
		return true;
	} catch (error) {
		console.log("❌ Trunk validation failed");
		return false;
	}
}

export function installActInstructions(): void {
	console.log("❌ Act CLI is not installed.");
	console.log("");
	console.log(
		"🚀 Recommended: Install with proto (already available in this project):",
	);
	console.log("  proto install act");
	console.log("");
	console.log("🔄 Alternative installation methods:");
	console.log("🍎 macOS:");
	console.log("  brew install act");
	console.log("");
	console.log("🐧 Linux:");
	console.log(
		"  curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash",
	);
	console.log("");
	console.log("🪟 Windows:");
	console.log("  choco install act-cli");
	console.log("  # or");
	console.log("  scoop install act");
	console.log("");
	console.log("📖 More info: https://github.com/nektos/act");
}
