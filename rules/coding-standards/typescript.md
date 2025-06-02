# TypeScript Coding Standards

This document defines the TypeScript coding standards and conventions used in the proto-plugins project.

## 🎯 Core TypeScript Principles

### 1. **Strict Mode Always**
- Use TypeScript strict mode in all files
- Enable all strict flags in `tsconfig.json`
- No `@ts-ignore` comments without detailed justification

### 2. **Explicit Types**
- Prefer explicit return types for functions
- Use type annotations for complex variables
- Avoid `any` - use `unknown` or proper types instead

### 3. **Modern TypeScript Features**
- Use ES2022+ features (target: ES2022)
- Leverage template literal types
- Use const assertions where appropriate
- Utilize utility types (Partial, Pick, Omit, etc.)

## 📝 Type Definitions

### Interface vs Type Aliases

```typescript
// ✅ GOOD: Use interfaces for object shapes that might be extended
interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  assets: GitHubAsset[];
  published_at: string;
}

interface GitHubRepository extends GitHubRelease {
  description: string;
  homepage: string;
}

// ✅ GOOD: Use type aliases for unions, primitives, and computed types
type RuntimeType = 'node' | 'bun' | 'deno';
type ProtoPluginType = 'binary' | 'language' | 'tool';
type ConfigValue = string | number | boolean | null;

// ✅ GOOD: Use type aliases for complex computed types
type PartialProtoPlugin = Partial<Pick<ProtoPlugin, 'name' | 'version' | 'platform'>>;
```

### Generic Type Patterns

```typescript
// ✅ GOOD: Well-constrained generics
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

interface Repository<T extends string = string> {
  owner: T;
  name: T;
  url: `https://github.com/${T}/${T}`;
}

// ✅ GOOD: Generic functions with constraints
function processItems<T extends { id: string }>(
  items: T[],
  processor: (item: T) => void
): void {
  for (const item of items) {
    processor(item);
  }
}

// ❌ BAD: Unconstrained generics
function badGeneric<T>(input: T): T {
  return input; // Too generic, no value added
}
```

### Utility Types Usage

```typescript
// ✅ GOOD: Leverage built-in utility types
interface ProtoPlugin {
  name: string;
  version: string;
  platform: string;
  install: InstallConfig;
  resolve: ResolveConfig;
}

// Create variations using utility types
type ProtoPluginInput = Omit<ProtoPlugin, 'version'> & {
  version?: string;
};

type ProtoPluginSummary = Pick<ProtoPlugin, 'name' | 'version' | 'platform'>;

type PartialProtoPlugin = Partial<ProtoPlugin>;

// ✅ GOOD: Custom utility types for project-specific needs
type Nullable<T> = T | null;
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
```

## 🔧 Function Patterns

### Function Signatures

```typescript
// ✅ GOOD: Explicit return types and parameter types
export async function fetchGitHubRelease(
  owner: string,
  repo: string,
  options?: {
    includePrerelease?: boolean;
    timeout?: number;
  }
): Promise<GitHubRelease> {
  // Implementation
}

// ✅ GOOD: Function overloads for different use cases
export function parseVersion(version: string): SemanticVersion;
export function parseVersion(version: string, strict: true): SemanticVersion;
export function parseVersion(version: string, strict: false): SemanticVersion | null;
export function parseVersion(
  version: string,
  strict: boolean = true
): SemanticVersion | null {
  // Implementation with proper type guards
}

// ❌ BAD: Implicit return types and loose parameters
export async function fetchRelease(owner, repo, options) {
  // No type safety
}
```

### Error Handling Patterns

```typescript
// ✅ GOOD: Typed error handling with custom error classes
import { GitHubError, ValidationError } from '../utils/errors.ts';

export async function validateAndFetchRelease(
  owner: string,
  repo: string
): Promise<GitHubRelease> {
  // Input validation
  if (!owner || !repo) {
    throw new ValidationError('Owner and repo are required', { owner, repo });
  }

  try {
    const release = await fetchGitHubRelease(owner, repo);
    return release;
  } catch (error) {
    if (error instanceof GitHubError) {
      throw error; // Re-throw known errors
    }
    
    // Wrap unknown errors
    throw new GitHubError(
      'Failed to fetch GitHub release',
      { owner, repo, originalError: error }
    );
  }
}

// ✅ GOOD: Result type pattern for operations that might fail
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export async function safeParseJson<T>(
  jsonString: string
): Promise<Result<T, ValidationError>> {
  try {
    const data = JSON.parse(jsonString) as T;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: new ValidationError('Invalid JSON', { jsonString, error })
    };
  }
}
```

### Type Guards and Assertions

```typescript
// ✅ GOOD: Type guards for runtime validation
export function isGitHubRelease(obj: unknown): obj is GitHubRelease {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'tag_name' in obj &&
    'assets' in obj &&
    typeof (obj as any).id === 'number' &&
    typeof (obj as any).tag_name === 'string' &&
    Array.isArray((obj as any).assets)
  );
}

// ✅ GOOD: Assertion functions for validation
export function assertIsProtoPlugin(obj: unknown): asserts obj is ProtoPlugin {
  if (!isProtoPlugin(obj)) {
    throw new ValidationError('Invalid proto plugin format', { obj });
  }
}

// ✅ GOOD: Using type guards in practice
export function processRelease(data: unknown): GitHubRelease {
  if (!isGitHubRelease(data)) {
    throw new ValidationError('Invalid GitHub release data');
  }
  
  // TypeScript now knows data is GitHubRelease
  return data;
}
```

## 📦 Module Patterns

### Export Patterns

```typescript
// ✅ GOOD: Named exports with clear organization
// src/utils/github-utils.ts
export { fetchGitHubRelease } from './github-api.ts';
export { parseGitHubUrl } from './github-parser.ts';
export { validateGitHubRepo } from './github-validator.ts';

// Re-export types
export type {
  GitHubRelease,
  GitHubRepository,
  GitHubAsset,
} from '../types/github-types.ts';

// ✅ GOOD: Default exports for main classes or primary functionality
// src/services/github-service.ts
export default class GitHubService {
  // Implementation
}

// ❌ BAD: Mixed export patterns
export default function something() {}
export const other = 'value';
export { another } from './somewhere';
```

### Import Patterns

```typescript
// ✅ GOOD: Organized imports following ESLint rules
// Node.js built-ins first
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

// External packages
import { parse } from '@typescript-eslint/typescript-estree';
import { fc } from 'fast-check';

// Internal types (with type-only imports)
import type {
  GitHubRelease,
  ProtoPlugin,
  ValidationResult,
} from '../types/index.ts';

// Internal modules
import { GitHubError, ValidationError } from '../utils/errors.ts';
import { validateProtoPlugin } from '../validation/plugin.ts';
import { logger } from '../utils/logger.ts';

// ❌ BAD: Mixed import order
import { GitHubError } from '../utils/errors.ts';
import { readFileSync } from 'node:fs';
import type { GitHubRelease } from '../types/index.ts';
import { parse } from '@typescript-eslint/typescript-estree';
```

## 🎨 Advanced TypeScript Patterns

### Template Literal Types

```typescript
// ✅ GOOD: Template literal types for URL patterns
type GitHubUrl = `https://github.com/${string}/${string}`;
type ApiEndpoint = `/api/v1/${string}`;
type SemverPattern = `${number}.${number}.${number}`;

// ✅ GOOD: Template literal types with unions
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogMessage = `[${LogLevel}] ${string}`;

interface Logger {
  log(message: LogMessage): void;
}
```

### Conditional Types

```typescript
// ✅ GOOD: Conditional types for API responses
type ApiResult<T> = T extends string
  ? { message: T }
  : T extends object
  ? { data: T }
  : { value: T };

// ✅ GOOD: Conditional types for function overloads
type ParseResult<T extends boolean> = T extends true
  ? ProtoPlugin
  : ProtoPlugin | null;

export function parseProtoPlugin<T extends boolean = true>(
  content: string,
  strict?: T
): ParseResult<T> {
  // Implementation with proper return type based on strict parameter
}
```

### Mapped Types

```typescript
// ✅ GOOD: Mapped types for configuration
type ConfigKeys = 'apiUrl' | 'timeout' | 'retries' | 'debug';

type Config = {
  [K in ConfigKeys]: K extends 'timeout' | 'retries'
    ? number
    : K extends 'debug'
    ? boolean
    : string;
};

// ✅ GOOD: Mapped types for validation
type ValidationRules<T> = {
  [K in keyof T]?: (value: T[K]) => boolean;
};

interface ProtoPluginValidation extends ValidationRules<ProtoPlugin> {
  name?: (value: string) => boolean;
  version?: (value: string) => boolean;
  platform?: (value: string) => boolean;
}
```

## 🚨 Common Anti-Patterns

### 1. **Overuse of `any`**

```typescript
// ❌ BAD: Using any
function processData(data: any): any {
  return data.someProperty;
}

// ✅ GOOD: Proper typing
function processData<T extends Record<string, unknown>>(
  data: T
): T[keyof T] {
  return data[Object.keys(data)[0]];
}
```

### 2. **Missing Return Types**

```typescript
// ❌ BAD: Implicit return type
export async function fetchData(url: string) {
  const response = await fetch(url);
  return response.json();
}

// ✅ GOOD: Explicit return type
export async function fetchData<T>(url: string): Promise<T> {
  const response = await fetch(url);
  return response.json() as T;
}
```

### 3. **Weak Type Definitions**

```typescript
// ❌ BAD: Weak interface
interface Config {
  [key: string]: any;
}

// ✅ GOOD: Strong interface
interface Config {
  apiUrl: string;
  timeout: number;
  retries: number;
  debug: boolean;
  headers?: Record<string, string>;
}
```

## 📋 TypeScript Checklist

For every TypeScript file:

- [ ] **Strict Mode**: Uses strict TypeScript settings
- [ ] **Explicit Types**: Functions have explicit return types
- [ ] **No Any**: Avoids `any` type, uses proper types or `unknown`
- [ ] **Type Guards**: Uses type guards for runtime validation
- [ ] **Error Handling**: Uses typed error handling patterns
- [ ] **Imports**: Follows import organization rules
- [ ] **Exports**: Uses consistent export patterns
- [ ] **Documentation**: Has JSDoc comments for public APIs
- [ ] **Generics**: Uses well-constrained generic types
- [ ] **Utility Types**: Leverages TypeScript utility types appropriately

---

*These standards ensure type safety, maintainability, and consistency across the proto-plugins codebase.*
