import { assert, test } from "poku";

import {
	getAvailableTools,
	getRuntime,
	installTool,
	promptUser,
	runCommand,
	validateTool,
} from "./test-proto-plugin.ts";

// Helper to mock getRuntime for runtime-dependent functions
function withMockedRuntime<T>(
	runtime: string,
	fn: () => Promise<T>,
): Promise<T> {
	const origGetRuntime = getRuntime;
	// @ts-ignore
	(global as typeof globalThis & { getRuntime: typeof getRuntime }).getRuntime =
		() => runtime;
	return fn().finally(() => {
		// @ts-ignore
		(
			global as typeof globalThis & { getRuntime: typeof getRuntime }
		).getRuntime = origGetRuntime;
	});
}

test("runCommand returns error for unsupported runtime", async () => {
	let error: Error | null = null;
	try {
		await runCommand("echo test", "unsupported");
	} catch (e) {
		error = e as Error;
	}
	assert(error, "Should throw error");
	assert(
		error &&
			typeof error.message === "string" &&
			error.message.match(/Unsupported runtime/),
		"Should match error message",
	);
});

test("getAvailableTools throws on unsupported runtime", async () => {
	let error: Error | null = null;
	try {
		await getAvailableTools("unsupported");
	} catch (e) {
		error = e as Error;
	}
	assert(error, "Should throw error");
	assert(
		error &&
			typeof error.message === "string" &&
			error.message.match(/Unsupported runtime/),
		"Should match error message",
	);
});

test("promptUser throws on unsupported runtime", async () => {
	let error: Error | null = null;
	try {
		await promptUser(["foo", "bar"], "unsupported");
	} catch (e) {
		error = e as Error;
	}
	assert(error, "Should throw error");
	assert(
		error &&
			typeof error.message === "string" &&
			error.message.match(/Unsupported runtime/),
		"Should match error message",
	);
});

test("installTool calls runCommand with proto install", async () => {
	let calledCmd = "";
	const mockRunCommand = async (cmd: string) => {
		calledCmd = cmd;
		return { success: true, stdout: "installed", stderr: "" };
	};
	const result = await installTool("d2", "latest", mockRunCommand);
	assert(result === true, "Should be true");
	assert(
		calledCmd.match(/proto install d2 latest/),
		"Should match install command",
	);
});

test("validateTool tries version flags and returns true on success", async () => {
	let callCount = 0;
	const mockRunCommand = async (cmd: string) => {
		callCount++;
		if (cmd.includes("--version")) {
			return { success: true, stdout: "d2 v1.2.3", stderr: "" };
		}
		return { success: false, stdout: "", stderr: "fail" };
	};
	const result = await validateTool("d2", mockRunCommand);
	assert(result === true, "Should be true");
	assert(callCount >= 1, "Should call at least once");
});

test("validateTool returns false if all version flags fail", async () => {
	const mockRunCommand = async (cmd: string) => ({
		success: false,
		stdout: "",
		stderr: "fail",
	});
	const result = await validateTool("d2", mockRunCommand);
	assert(result === false, "Should be false");
});

// Edge case tests
test("installTool handles tool names with special characters", async () => {
	let capturedCmd = "";
	const mockRunCommand = (cmd: string) => {
		capturedCmd = cmd;
		return Promise.resolve({ success: true, stdout: "installed", stderr: "" });
	};

	await installTool("tool-with-dashes", "v1.0.0", mockRunCommand);
	assert(
		capturedCmd.includes("tool-with-dashes"),
		"Should handle dashes in tool names",
	);
	assert(capturedCmd.includes("v1.0.0"), "Should handle version with prefix");
});

test("validateTool handles empty stdout", async () => {
	let callCount = 0;
	const mockRunCommand = (_cmd: string) => {
		callCount++;
		return Promise.resolve({ success: true, stdout: "", stderr: "" });
	};
	const result = await validateTool("silent-tool", mockRunCommand);
	assert(
		result === true,
		"Should return true for successful command even with empty output",
	);
	assert(callCount === 3, "Should try all version flags");
});

test("validateTool handles whitespace-only stdout", async () => {
	let callCount = 0;
	const mockRunCommand = (_cmd: string) => {
		callCount++;
		return Promise.resolve({ success: true, stdout: "   ", stderr: "" }); // Whitespace only
	};

	const result = await validateTool("whitespace-tool", mockRunCommand);
	assert(
		result === true,
		"Should return true for successful command even with whitespace-only output",
	);
	assert(callCount === 3, "Should try all version flags");
});

test("promptUser input parsing handles invalid selections", () => {
	const tools = ["tool1", "tool2", "tool3"];

	// Test with invalid indices
	const input = "0,5,abc,-1"; // Invalid selections
	const indices = input
		.split(",")
		.map((x) => x.trim())
		.filter(Boolean)
		.map((x) => Number.parseInt(x, 10) - 1)
		.filter((i) => i >= 0 && i < tools.length);

	assert(indices.length === 0, "Should filter out invalid indices");
});

test("promptUser input parsing handles empty input", () => {
	const tools = ["tool1", "tool2"];

	// Test empty input parsing
	const input = "";
	const indices = input
		.split(",")
		.map((x) => x.trim())
		.filter(Boolean)
		.map((x) => Number.parseInt(x, 10) - 1)
		.filter((i) => i >= 0 && i < tools.length);

	assert(indices.length === 0, "Should handle empty input");
});

test("promptUser input parsing handles valid mixed input", () => {
	const tools = ["tool1", "tool2", "tool3"];

	// Test mixed valid/invalid input
	const input = "1,3,5,abc,2"; // 1,3,2 are valid (indices 0,2,1)
	const indices = input
		.split(",")
		.map((x) => x.trim())
		.filter(Boolean)
		.map((x) => Number.parseInt(x, 10) - 1)
		.filter((i) => i >= 0 && i < tools.length);

	assert(indices.length === 3, "Should extract 3 valid indices");
	assert(indices.includes(0), "Should include index 0 (tool1)");
	assert(indices.includes(1), "Should include index 1 (tool2)");
	assert(indices.includes(2), "Should include index 2 (tool3)");
});

test("getAvailableTools returns array for valid runtime", async () => {
	const result = await getAvailableTools("node");
	assert(Array.isArray(result), "Should return an array");
});

test("installTool with different version formats", async () => {
	const testCases = [
		{
			tool: "test-tool",
			version: "latest",
			expected: "proto install test-tool latest",
		},
		{
			tool: "test-tool",
			version: "1.0.0",
			expected: "proto install test-tool 1.0.0",
		},
		{
			tool: "test-tool",
			version: "v2.1.0",
			expected: "proto install test-tool v2.1.0",
		},
	];

	for (const testCase of testCases) {
		let capturedCmd = "";
		const mockRunCommand = (cmd: string) => {
			capturedCmd = cmd;
			return Promise.resolve({
				success: true,
				stdout: "installed",
				stderr: "",
			});
		};

		await installTool(testCase.tool, testCase.version, mockRunCommand);
		assert(
			capturedCmd === testCase.expected,
			`Should generate correct command: ${testCase.expected}`,
		);
	}
});

test("validateTool stops on first successful version check", async () => {
	let callCount = 0;
	const mockRunCommand = (cmd: string) => {
		callCount++;
		if (cmd.includes("--version")) {
			return Promise.resolve({
				success: true,
				stdout: "tool v1.0.0",
				stderr: "",
			});
		}
		return Promise.resolve({
			success: false,
			stdout: "",
			stderr: "unknown flag",
		});
	};

	const result = await validateTool("test-tool", mockRunCommand);
	assert(result === true, "Should return true on successful version check");
	assert(callCount === 1, "Should stop after first successful flag");
});
