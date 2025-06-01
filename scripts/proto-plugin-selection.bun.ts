#!/usr/bin/env bun

import { $ } from "bun";
import { parse } from "jsr:@std/toml";

const repoOwner = "continuous-quality-dev";
const repo = "proto-plugins";
const branch = "main";

interface BaseProtoRegistryEntry {
  id: string;
  locator: string;
  description: string;
  author: string;
}

interface ProtoRegistryEntry extends BaseProtoRegistryEntry {
  name: string;
  format: "wasm" | "toml";
  homepageUrl: string;
  repositoryUrl: string;
  devicon: string;
  bins: string[];
}

// Using Bun's $ for shell commands
const protoRegistryOutput = await $`proto plugin search '' --json`.text();
const ProtoRegistry: ProtoRegistryEntry[] = JSON.parse(protoRegistryOutput);

// Rest of implementation would be similar but using Bun's APIs
// For example, for file operations:
const currentPrototools = parse(await Bun.file(".prototools").text());
const currentTools = Object.values(currentPrototools.plugins);

// For interactive selection, you might need to use a different approach
// since Bun doesn't have built-in interactive prompts like dax
// You could use a package like 'enquirer' or 'prompts'
