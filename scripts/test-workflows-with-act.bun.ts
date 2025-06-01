#!/usr/bin/env bun

/**
 * Test GitHub workflows locally using act CLI
 * Usage: bun scripts/test-workflows-with-act.bun.ts [workflow] [options]
 */

import { existsSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { $ } from "bun";

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

async function checkActInstallation(): Promise<boolean> {
  try {
    // First try direct act command
    await $`act --version`.quiet();
    return true;
  } catch (error) {
    // Try with proto
    try {
      await $`proto run act -- --version`.quiet();
      return true;
    } catch (protoError) {
      return false;
    }
  }
}

async function installActWithProto(): Promise<boolean> {
  console.log("📦 Installing act CLI with proto...");

  try {
    await $`proto install act`;
    console.log("✅ Act CLI installed successfully with proto");
    return true;
  } catch (error) {
    console.log("❌ Failed to install act with proto");
    return false;
  }
}

async function getActCommand(): Promise<string> {
  // Check if act is available directly
  try {
    await $`act --version`.quiet();
    return "act";
  } catch (error) {
    // Use proto run
    return "proto run act --";
  }
}

// Rest of implementation would follow similar pattern using Bun's $ API
// for shell commands instead of Node.js child_process
