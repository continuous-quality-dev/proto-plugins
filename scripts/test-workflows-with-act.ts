#!/usr/bin/env node --experimental-strip-types

/**
 * Test GitHub workflows locally using act CLI
 * Usage: node --experimental-strip-types scripts/test-workflows-with-act.ts [workflow] [options]
 */

import { execSync, spawn } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface ActTestOptions {
	workflow?: string;
	event?: string;
	dryRun?: boolean;
	verbose?: boolean;
	platform?: string;
	job?: string;
	matrix?: string;
	secrets?: Record<string, string>;
	vars?: Record<string, string>;
}

function checkActInstallation(): boolean {
	try {
		// First try direct act command
		execSync("act --version", { stdio: "pipe" });
		return true;
	} catch (error) {
		// Try with proto
		try {
			execSync("proto run act -- --version", { stdio: "pipe" });
			return true;
		} catch (protoError) {
			return false;
		}
	}
}

function installActWithProto(): boolean {
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

function getActCommand(): string {
	// Check if act is available directly
	try {
		execSync("act --version", { stdio: "pipe" });
		return "act";
	} catch (error) {
		// Use proto run
		return "proto run act --";
	}
}

function checkTrunkInstallation(): boolean {
	try {
		execSync("trunk --version", { stdio: "pipe" });
		return true;
	} catch (error) {
		return false;
	}
}

function validateWorkflowsWithTrunk(): boolean {
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

function installActInstructions(): void {
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

function createActConfig(): void {
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

function createSecretsFile(): string {
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

function createEventFile(event: string, inputs?: Record<string, any>): string {
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

function getAvailableWorkflows(): string[] {
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

function runActCommand(options: ActTestOptions): void {
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

function showUsage(): void {
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

async function main(): Promise<void> {
	const args = process.argv.slice(2);

	// Parse arguments
	const options: ActTestOptions = {
		workflow: "test-plugins.yml",
		event: "workflow_dispatch",
		dryRun: false,
		verbose: false,
		platform: "ubuntu-latest",
	};

	let skipValidation = false;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === "--help" || arg === "-h") {
			showUsage();
			return;
		} else if (arg === "--dry-run") {
			options.dryRun = true;
		} else if (arg === "--verbose" || arg === "-v") {
			options.verbose = true;
		} else if (arg === "--skip-validation") {
			skipValidation = true;
		} else if (arg === "--workflow") {
			options.workflow = args[++i];
		} else if (arg === "--event") {
			options.event = args[++i];
		} else if (arg === "--job") {
			options.job = args[++i];
		} else if (arg === "--platform") {
			options.platform = args[++i];
		} else if (arg === "--matrix") {
			options.matrix = args[++i];
		} else if (!arg.startsWith("--") && !options.workflow?.includes(arg)) {
			// First non-option argument is the workflow
			options.workflow = arg;
		}
	}

	console.log("🧪 Proto Plugins Workflow Testing with Act\n");

	// Check if Trunk is installed and validate workflows first
	if (!skipValidation) {
		if (!checkTrunkInstallation()) {
			console.log("⚠️  Trunk CLI not found. Skipping workflow validation.");
			console.log("   Install Trunk: https://docs.trunk.io/check/usage");
		} else {
			console.log("✅ Trunk CLI is installed");

			if (!validateWorkflowsWithTrunk()) {
				console.log(
					"❌ Workflow validation failed. Fix issues before testing with act.",
				);
				console.log("   Run: npm run validate-workflows");
				process.exit(1);
			}
		}
	} else {
		console.log("⚠️  Skipping workflow validation (--skip-validation flag)");
	}

	// Check if act is installed
	if (!checkActInstallation()) {
		console.log("❌ Act CLI is not installed");
		console.log("");
		console.log("🚀 Would you like to install act with proto? (Y/n)");

		// For now, just show instructions since we can't easily get user input in this context
		console.log("");
		console.log("💡 To install act with proto, run:");
		console.log("   proto install act");
		console.log("");
		console.log("   Then re-run this script.");
		console.log("");
		installActInstructions();
		process.exit(1);
	}

	const actCommand = getActCommand();
	if (actCommand.includes("proto")) {
		console.log("✅ Act CLI is available via proto");
	} else {
		console.log("✅ Act CLI is installed");
	}

	// Validate workflow file exists
	const workflowPath = `.github/workflows/${options.workflow}`;
	if (!existsSync(workflowPath)) {
		console.log(`❌ Workflow file not found: ${workflowPath}`);
		console.log("\nAvailable workflows:");
		getAvailableWorkflows().forEach((w) => console.log(`  - ${w}`));
		process.exit(1);
	}

	// Run the test
	runActCommand(options);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error("❌ Workflow testing failed:", error);
		process.exit(1);
	});
}
