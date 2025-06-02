# AI Code Generation Rules

This document defines the rules and patterns for AI-assisted code generation in the proto-plugins project.

## 🎯 Core Principles

### 1. **Type Safety First**
- Always use TypeScript strict mode
- Prefer explicit types over `any`
- Use type guards for runtime validation
- Import types with `import type` when possible

### 2. **Cross-Runtime Compatibility**
- Support Node.js, Bun, and Deno
- Use standard Web APIs when available
- Isolate runtime-specific code in utils
- Test across all supported runtimes

### 3. **Error Handling Consistency**
- Use custom error classes from `src/utils/errors.ts`
- Provide meaningful error messages
- Include context in error details
- Handle async errors properly

## 📝 Code Generation Patterns

### TypeScript Function Generation

```typescript
// ✅ GOOD: Follows project patterns
export async function fetchGitHubRelease(
  owner: string,
  repo: string,
  options?: FetchOptions
): Promise<GitHubRelease> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'proto-plugins',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new GitHubError(
        `Failed to fetch release: ${response.status} ${response.statusText}`,
        { owner, repo, status: response.status }
      );
    }

    return await response.json() as GitHubRelease;
  } catch (error) {
    if (error instanceof GitHubError) {
      throw error;
    }
    throw new GitHubError('Unexpected error fetching GitHub release', { owner, repo, error });
  }
}

// ❌ BAD: Violates project patterns
function fetchRelease(owner, repo) {
  return fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`)
    .then(r => r.json());
}
```

### Import Organization

```typescript
// ✅ GOOD: Follows import order rules
import { readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";

import { parse } from "@typescript-eslint/typescript-estree";

import type { GitHubRelease, ProtoPlugin } from "../types/index.ts";
import { GitHubError, ValidationError } from "../utils/errors.ts";
import { validateProtoPlugin } from "../validation/plugin.ts";

// ❌ BAD: Mixed import order
import { GitHubError } from "../utils/errors.ts";
import { readFileSync } from "node:fs";
import type { GitHubRelease } from "../types/index.ts";
import { parse } from "@typescript-eslint/typescript-estree";
```

### Configuration File Generation

```typescript
// ✅ GOOD: Type-safe configuration
interface ESLintConfig {
  root: boolean;
  extends: string[];
  parser: string;
  parserOptions: {
    ecmaVersion: number;
    sourceType: 'module' | 'script';
    project?: string;
  };
  plugins: string[];
  rules: Record<string, unknown>;
}

export function generateESLintConfig(options: ConfigOptions): ESLintConfig {
  return {
    root: true,
    extends: ['eslint:recommended', '@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      ...(options.typeChecking && { project: './tsconfig.json' }),
    },
    plugins: ['@typescript-eslint', 'import', 'promise'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'import/order': ['warn', { groups: ['builtin', 'external', 'internal'] }],
    },
  };
}
```

## 🧪 Test Generation Patterns

### Property-Based Testing

```typescript
// ✅ GOOD: Property-based test with fast-check
import { fc } from 'fast-check';
import { describe, it } from 'poku';

describe('parseGitHubUrl', () => {
  it('should parse valid GitHub URLs correctly', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 39 }).filter(s => /^[a-zA-Z0-9-]+$/.test(s)),
      fc.string({ minLength: 1, maxLength: 100 }).filter(s => /^[a-zA-Z0-9-_.]+$/.test(s)),
      (owner, repo) => {
        const url = `https://github.com/${owner}/${repo}`;
        const result = parseGitHubUrl(url);
        
        expect(result.owner).toBe(owner);
        expect(result.repo).toBe(repo);
      }
    ));
  });

  it('should handle edge cases', () => {
    const testCases = [
      { input: 'https://github.com/owner/repo.git', expected: { owner: 'owner', repo: 'repo' } },
      { input: 'https://github.com/owner/repo/', expected: { owner: 'owner', repo: 'repo' } },
    ];

    for (const { input, expected } of testCases) {
      const result = parseGitHubUrl(input);
      expect(result).toEqual(expected);
    }
  });
});
```

### Cross-Runtime Testing

```typescript
// ✅ GOOD: Cross-runtime test structure
import { describe, it } from 'poku';
import { detectRuntime } from '../utils/runtime.ts';

describe('cross-runtime compatibility', () => {
  it('should work across all supported runtimes', async () => {
    const runtime = detectRuntime();
    console.log(`Testing on ${runtime}`);

    // Test implementation that works on Node.js, Bun, and Deno
    const result = await someFunction();
    expect(result).toBeDefined();
  });
});
```

## 📁 File Generation Rules

### File Naming Conventions

```typescript
// ✅ GOOD: Follows naming patterns
src/
├── core/
│   ├── generate-proto-plugin.ts        # kebab-case for files
│   ├── generate-proto-plugin.test.ts   # .test.ts for tests
│   └── generate-proto-plugin.property.test.ts  # .property.test.ts for property tests
├── types/
│   ├── github-types.ts                 # descriptive type files
│   └── proto-types.ts
└── utils/
    ├── github-utils.ts                 # utility functions
    └── proto-utils.ts

// ❌ BAD: Inconsistent naming
src/
├── core/
│   ├── generateProtoPlugin.ts          # camelCase files
│   ├── generate_proto_plugin_test.ts   # snake_case tests
│   └── GenerateProtoPlugin.ts          # PascalCase files
```

### File Header Generation

```typescript
// ✅ GOOD: Consistent file headers
#!/usr/bin/env node
/**
 * @fileoverview GitHub API utilities for fetching repository information
 * @module github-utils
 */

import type { GitHubRelease, GitHubRepository } from '../types/github-types.ts';

/**
 * Fetches the latest release for a GitHub repository
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Promise resolving to the latest release
 * @throws {GitHubError} When the API request fails
 */
export async function fetchLatestRelease(
  owner: string,
  repo: string
): Promise<GitHubRelease> {
  // Implementation
}
```

## 🔧 Configuration Generation

### Package.json Scripts

```json
{
  "scripts": {
    "// === Development ===": "",
    "dev": "node --experimental-strip-types src/cli/index.ts",
    "build": "tsc --noEmit",
    
    "// === Testing ===": "",
    "test": "poku",
    "test:node": "node --test",
    "test:bun": "bun test",
    "test:deno": "deno test",
    "test:property": "node --experimental-strip-types src/**/*.property.test.ts",
    
    "// === Linting ===": "",
    "lint": "eslint --config config/eslint.config.ts .",
    "lint:fix": "eslint --config config/eslint.config.ts . --fix",
    "trunk:check": "trunk check",
    
    "// === Plugin Operations ===": "",
    "plugin:generate": "node --experimental-strip-types src/core/generate-proto-plugin.ts",
    "plugin:test": "node --experimental-strip-types src/core/test-proto-plugin.ts"
  }
}
```

## 🚨 Anti-Patterns to Avoid

### 1. **Inconsistent Error Handling**

```typescript
// ❌ BAD: Inconsistent error handling
function badFunction() {
  throw new Error('Something went wrong');  // Generic Error
  return null;  // Mixed return types
}

// ✅ GOOD: Consistent error handling
function goodFunction(): string {
  throw new ValidationError('Invalid input provided', { input });
}
```

### 2. **Missing Type Safety**

```typescript
// ❌ BAD: Using any
function processData(data: any): any {
  return data.someProperty;
}

// ✅ GOOD: Proper typing
function processData<T extends { someProperty: string }>(data: T): string {
  return data.someProperty;
}
```

### 3. **Runtime-Specific Code in Core**

```typescript
// ❌ BAD: Runtime-specific code in core logic
import { execSync } from 'node:child_process';  // Node.js only

// ✅ GOOD: Abstracted runtime handling
import { execCommand } from '../utils/runtime.ts';  // Cross-runtime utility
```

## 📋 Code Generation Checklist

Before submitting AI-generated code:

- [ ] **Type Safety**: All functions have explicit return types
- [ ] **Error Handling**: Uses custom error classes with context
- [ ] **Cross-Runtime**: Works on Node.js, Bun, and Deno
- [ ] **Testing**: Includes both unit and property-based tests
- [ ] **Documentation**: Has JSDoc comments for public APIs
- [ ] **Imports**: Follows import order and organization rules
- [ ] **Naming**: Uses consistent naming conventions
- [ ] **Performance**: Considers caching and optimization
- [ ] **Security**: Validates inputs and handles sensitive data properly

## 🔄 Continuous Improvement

These patterns evolve based on:

- **Code Review Feedback**: Patterns that emerge during reviews
- **Performance Analysis**: Optimizations discovered through profiling
- **Community Input**: Suggestions from contributors
- **Tool Updates**: Changes in TypeScript, ESLint, or other tools

## 🔗 Related Rules

- [TypeScript Standards](../coding-standards/typescript.md) - TypeScript-specific coding rules
- [Naming Conventions](../coding-standards/naming-conventions.md) - Consistent naming patterns
- [Testing Patterns](./testing.md) - AI-assisted testing guidelines
- [Plugin Generation](../project-patterns/plugin-generation.md) - Plugin-specific generation rules

---

*Last updated: Generated automatically by AI assistant following established patterns*
