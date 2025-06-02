/**
 * CLI-specific types and interfaces
 */

export interface CLICommand {
	name: string;
	description: string;
	usage: string;
	options: CLIOption[];
	examples: string[];
	handler: (args: string[]) => Promise<void> | void;
}

export interface CLIOption {
	flag: string;
	alias?: string;
	description: string;
	type: "boolean" | "string" | "number";
	required?: boolean;
	default?: unknown;
}

export interface CLIOptions {
	auto?: boolean;
	output?: string;
	help?: boolean;
	version?: boolean;
	verbose?: boolean;
	quiet?: boolean;
	runtime?: "node" | "bun" | "deno";
}

export interface GenerateOptions extends CLIOptions {
	url?: string;
	interactive?: boolean;
	force?: boolean;
}

export interface TestOptions extends CLIOptions {
	plugin?: string;
	platform?: string;
	timeout?: number;
	retries?: number;
}

export interface SelectOptions extends CLIOptions {
	installAll?: boolean;
	local?: boolean;
	registry?: boolean;
}

export interface AnalyzeOptions extends CLIOptions {
	complexity?: boolean;
	diagrams?: boolean;
	output?: string;
}
