/**
 * CLI entry points and command definitions
 */

export { generateCommand } from "./commands/generate.ts";
export { testCommand } from "./commands/test.ts";
export { selectCommand } from "./commands/select.ts";
export { analyzeCommand } from "./commands/analyze.ts";

export type { CLICommand, CLIOptions } from "./types.ts";
