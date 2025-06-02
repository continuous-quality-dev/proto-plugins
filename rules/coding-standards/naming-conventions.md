# Naming Conventions

This document defines the naming conventions used throughout the proto-plugins project to ensure consistency and readability.

## 🎯 General Principles

### 1. **Clarity Over Brevity**
- Use descriptive names that clearly indicate purpose
- Avoid abbreviations unless they are widely understood
- Prefer longer, clear names over short, cryptic ones

### 2. **Consistency**
- Follow established patterns within the codebase
- Use the same naming style for similar concepts
- Maintain consistency across files and modules

### 3. **Context Awareness**
- Names should make sense within their context
- Avoid redundant prefixes when context is clear
- Use domain-specific terminology appropriately

## 📁 File and Directory Naming

### File Names

```
✅ GOOD: kebab-case for all files
src/
├── core/
│   ├── generate-proto-plugin.ts
│   ├── test-proto-plugin.ts
│   └── proto-plugin-validator.ts
├── utils/
│   ├── github-utils.ts
│   ├── proto-utils.ts
│   └── runtime-utils.ts
└── types/
    ├── github-types.ts
    ├── proto-types.ts
    └── complexity-types.ts

❌ BAD: Mixed naming styles
src/
├── core/
│   ├── generateProtoPlugin.ts      # camelCase
│   ├── TestProtoPlugin.ts          # PascalCase
│   └── proto_plugin_validator.ts   # snake_case
```

### Test File Names

```
✅ GOOD: Descriptive test file naming
src/
├── core/
│   ├── generate-proto-plugin.ts
│   ├── generate-proto-plugin.test.ts           # Unit tests
│   ├── generate-proto-plugin.property.test.ts # Property-based tests
│   └── generate-proto-plugin.integration.test.ts # Integration tests
├── utils/
│   ├── github-utils.ts
│   ├── github-utils.test.ts
│   └── github-utils.property.test.ts

❌ BAD: Inconsistent test naming
src/
├── core/
│   ├── generate-proto-plugin.ts
│   ├── generate-proto-plugin_test.ts    # snake_case
│   ├── generateProtoPluginTest.ts       # camelCase
│   └── test-generate-proto-plugin.ts    # prefix instead of suffix
```

### Directory Names

```
✅ GOOD: Clear, descriptive directory names
src/
├── analysis/           # Code analysis and metrics
├── cli/               # Command-line interface
├── config/            # Configuration management
├── constants/         # Application constants
├── core/              # Core business logic
├── diagrams/          # Diagram generation
├── services/          # External service integrations
├── types/             # Type definitions
├── utils/             # Shared utilities
└── validation/        # Input validation

config/                # Configuration files
docs/                  # Documentation
rules/                 # AI assistance rules
scripts/               # Build and utility scripts
```

## 🔤 Variable and Function Naming

### Variables

```typescript
// ✅ GOOD: Descriptive camelCase variables
const gitHubApiUrl = 'https://api.github.com';
const maxRetryAttempts = 3;
const isValidProtoPlugin = true;
const userProvidedOptions = { timeout: 5000 };

// ✅ GOOD: Boolean variables with clear intent
const hasValidSignature = checkSignature(plugin);
const isInstallationRequired = !isAlreadyInstalled(tool);
const canRetryOperation = retryCount < maxRetryAttempts;
const shouldSkipValidation = options.skipValidation === true;

// ❌ BAD: Unclear or abbreviated names
const url = 'https://api.github.com';  // Too generic
const max = 3;                         // Unclear what max refers to
const valid = true;                    // Valid what?
const opts = { timeout: 5000 };       // Abbreviated
```

### Constants

```typescript
// ✅ GOOD: SCREAMING_SNAKE_CASE for module-level constants
export const DEFAULT_GITHUB_API_URL = 'https://api.github.com';
export const MAX_RETRY_ATTEMPTS = 3;
export const SUPPORTED_RUNTIMES = ['node', 'bun', 'deno'] as const;
export const PROTO_PLUGIN_SCHEMA_VERSION = '1.0.0';

// ✅ GOOD: Grouped constants in objects
export const HTTP_STATUS = {
  OK: 200,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
} as const;

export const ERROR_CODES = {
  GITHUB_API_ERROR: 'GITHUB_API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PROTO_ERROR: 'PROTO_ERROR',
} as const;

// ❌ BAD: Inconsistent constant naming
export const githubUrl = 'https://api.github.com';  // camelCase
export const Max_Retries = 3;                       // Mixed case
export const supported_runtimes = ['node'];         // snake_case
```

### Functions

```typescript
// ✅ GOOD: Verb-based function names that describe actions
export async function fetchGitHubRelease(owner: string, repo: string): Promise<GitHubRelease> {}
export function parseProtoPluginConfig(content: string): ProtoPlugin {}
export function validatePluginStructure(plugin: ProtoPlugin): ValidationResult {}
export function generatePluginFromRelease(release: GitHubRelease): ProtoPlugin {}

// ✅ GOOD: Boolean-returning functions with clear intent
export function isValidGitHubUrl(url: string): boolean {}
export function hasRequiredFields(plugin: ProtoPlugin): boolean {}
export function canInstallPlugin(plugin: ProtoPlugin): boolean {}
export function shouldRetryRequest(error: Error, attempt: number): boolean {}

// ✅ GOOD: Getter functions
export function getProtoToolsDirectory(): string {}
export function getCurrentRuntime(): RuntimeType {}
export function getPluginVersion(name: string): string | null {}

// ❌ BAD: Unclear function names
export function process(data: unknown): unknown {}     // Too generic
export function handle(input: string): void {}         // Unclear action
export function doStuff(options: object): void {}      // Meaningless
export function check(plugin: ProtoPlugin): boolean {} // Check what?
```

## 🏗️ Type and Interface Naming

### Interfaces

```typescript
// ✅ GOOD: PascalCase interfaces with descriptive names
export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  assets: GitHubAsset[];
}

export interface ProtoPlugin {
  name: string;
  version: string;
  platform: string;
  install: InstallConfig;
  resolve: ResolveConfig;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

// ✅ GOOD: Configuration interfaces
export interface GitHubApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
}

// ❌ BAD: Poor interface naming
export interface IRelease {}        // Hungarian notation
export interface releaseData {}     // camelCase
export interface Release_Data {}    // snake_case with underscore
export interface Data {}            // Too generic
```

### Type Aliases

```typescript
// ✅ GOOD: Descriptive type aliases
export type RuntimeType = 'node' | 'bun' | 'deno';
export type ProtoPluginType = 'binary' | 'language' | 'tool';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

// ✅ GOOD: Complex type aliases
export type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

export type PartialProtoPlugin = Partial<Pick<ProtoPlugin, 'name' | 'version'>>;
export type ConfigValue = string | number | boolean | null;

// ✅ GOOD: Function type aliases
export type ValidationFunction<T> = (value: T) => ValidationResult;
export type AsyncProcessor<T, R> = (input: T) => Promise<R>;
export type EventHandler<T> = (event: T) => void;

// ❌ BAD: Poor type naming
export type T = string | number;     // Single letter
export type data = object;           // camelCase
export type StringOrNumber = string | number;  // Redundant with union
```

### Generic Type Parameters

```typescript
// ✅ GOOD: Meaningful generic parameter names
export interface Repository<TOwner extends string, TName extends string> {
  owner: TOwner;
  name: TName;
  url: `https://github.com/${TOwner}/${TName}`;
}

export interface ApiClient<TConfig extends object, TResponse> {
  config: TConfig;
  request<TRequest>(data: TRequest): Promise<TResponse>;
}

// ✅ GOOD: Standard single-letter generics when meaning is clear
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

export function map<T, U>(items: T[], mapper: (item: T) => U): U[] {
  return items.map(mapper);
}

// ❌ BAD: Unclear generic names
export interface Thing<A, B, C> {}   // Meaningless letters
export interface Data<X> {}          // Unclear purpose
```

## 🏷️ Class and Enum Naming

### Classes

```typescript
// ✅ GOOD: PascalCase class names with clear purpose
export class GitHubService {
  async fetchRelease(owner: string, repo: string): Promise<GitHubRelease> {}
}

export class ProtoPluginValidator {
  validate(plugin: ProtoPlugin): ValidationResult {}
}

export class ConfigurationManager {
  load(path: string): Configuration {}
  save(config: Configuration): void {}
}

// ✅ GOOD: Error classes with descriptive names
export class GitHubApiError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
  }
}

export class ProtoPluginValidationError extends Error {
  constructor(message: string, public readonly field: string) {
    super(message);
  }
}

// ❌ BAD: Poor class naming
export class Manager {}              // Too generic
export class gitHubService {}       // camelCase
export class GitHub_Service {}      // snake_case
export class Util {}                // Unclear purpose
```

### Enums

```typescript
// ✅ GOOD: PascalCase enum names with descriptive values
export enum RuntimeType {
  Node = 'node',
  Bun = 'bun',
  Deno = 'deno',
}

export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

export enum HttpStatusCode {
  Ok = 200,
  NotFound = 404,
  RateLimited = 429,
  ServerError = 500,
}

// ✅ GOOD: Const assertions as alternative to enums
export const SUPPORTED_PLATFORMS = {
  LINUX: 'linux',
  MACOS: 'macos',
  WINDOWS: 'windows',
} as const;

export type SupportedPlatform = typeof SUPPORTED_PLATFORMS[keyof typeof SUPPORTED_PLATFORMS];

// ❌ BAD: Poor enum naming
export enum runtime {}              // camelCase
export enum LOG_LEVEL {}            // SCREAMING_SNAKE_CASE
export enum Status {                // Unclear values
  A = 1,
  B = 2,
  C = 3,
}
```

## 📦 Module and Package Naming

### Import Aliases

```typescript
// ✅ GOOD: Clear import aliases
import type { GitHubRelease as Release } from '../types/github-types.ts';
import { ProtoPluginValidator as Validator } from '../validation/plugin.ts';
import * as GitHubUtils from '../utils/github-utils.ts';
import * as fs from 'node:fs';

// ✅ GOOD: Avoiding naming conflicts
import { parse as parseJson } from '../utils/json-parser.ts';
import { parse as parseToml } from '../utils/toml-parser.ts';
import { parse as parseYaml } from '../utils/yaml-parser.ts';

// ❌ BAD: Unclear or conflicting aliases
import { GitHubRelease as GHR } from '../types/github-types.ts';  // Abbreviated
import { ProtoPluginValidator as PPV } from '../validation/plugin.ts';  // Abbreviated
import * as utils from '../utils/github-utils.ts';  // Too generic
```

### Package Names

```json
{
  "name": "proto-plugins",
  "scripts": {
    "plugin:generate": "...",
    "plugin:test": "...",
    "plugin:validate": "...",
    "test:node": "...",
    "test:bun": "...",
    "test:deno": "...",
    "lint:check": "...",
    "lint:fix": "..."
  }
}
```

## 🚨 Anti-Patterns to Avoid

### 1. **Hungarian Notation**

```typescript
// ❌ BAD: Hungarian notation
const strName = 'plugin-name';
const bIsValid = true;
const arrItems = [1, 2, 3];
interface IPlugin {}

// ✅ GOOD: Descriptive names without type prefixes
const pluginName = 'plugin-name';
const isValid = true;
const items = [1, 2, 3];
interface Plugin {}
```

### 2. **Abbreviations and Acronyms**

```typescript
// ❌ BAD: Unclear abbreviations
const cfg = loadConfig();
const repo = getRepo();
const auth = getAuth();
const req = makeReq();

// ✅ GOOD: Full words
const configuration = loadConfig();
const repository = getRepository();
const authentication = getAuthentication();
const request = makeRequest();
```

### 3. **Inconsistent Naming**

```typescript
// ❌ BAD: Inconsistent naming for similar concepts
function getUserData() {}
function fetchUserInfo() {}
function retrieveUserDetails() {}

// ✅ GOOD: Consistent naming pattern
function fetchUserData() {}
function fetchUserProfile() {}
function fetchUserPreferences() {}
```

## 📋 Naming Checklist

For every identifier:

- [ ] **Descriptive**: Name clearly indicates purpose or content
- [ ] **Consistent**: Follows established patterns in the codebase
- [ ] **Appropriate Case**: Uses correct casing for the identifier type
- [ ] **No Abbreviations**: Avoids unclear abbreviations
- [ ] **Context Aware**: Makes sense within its scope
- [ ] **Domain Appropriate**: Uses correct terminology for the domain
- [ ] **Searchable**: Easy to find with text search
- [ ] **Pronounceable**: Can be easily spoken in discussions

---

*These naming conventions ensure consistency, readability, and maintainability across the proto-plugins codebase.*
