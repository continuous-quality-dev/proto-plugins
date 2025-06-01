#!/usr/bin/env bun

/**
 * Generate a proto plugin JSON from a GitHub release URL
 * Usage:
 *   Interactive: bun scripts/generate-proto-plugin.bun.ts <github-url>
 *   Automated:   bun scripts/generate-proto-plugin.bun.ts --auto <github-url>
 *   Custom file: bun scripts/generate-proto-plugin.bun.ts --auto --output custom.json <github-url>
 */

import { writeFileSync } from "fs";
import { $ } from "bun";
import { file } from "bun";

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  content_type: string;
  size: number;
  download_count: number;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  assets: GitHubAsset[];
  body: string;
}

// Rest of the implementation would be similar but using Bun's APIs
// For example, instead of readline for prompts, we could use:
async function prompt(question: string): Promise<string> {
  process.stdout.write(question);
  const input = await new Promise<string>((resolve) => {
    process.stdin.once("data", (data) => {
      resolve(data.toString().trim());
    });
  });
  return input;
}

// For HTTP requests, use Bun's fetch API:
async function fetchGitHubRelease(
  owner: string,
  repo: string,
): Promise<GitHubRelease> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "proto-plugin-generator",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch release: ${response.status} ${response.statusText}`,
    );
  }

  return await response.json();
}

// For executing shell commands, use Bun's $ API:
async function checkCommand(cmd: string): Promise<boolean> {
  try {
    await $`${cmd} --version`.quiet();
    return true;
  } catch (error) {
    return false;
  }
}

// Main implementation would continue with similar logic but adapted for Bun
