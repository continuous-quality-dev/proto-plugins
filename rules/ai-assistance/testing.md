# AI Testing Rules

This document defines the rules and patterns for AI-assisted test generation and testing strategies in the proto-plugins project.

## 🎯 Core Testing Principles

### 1. **Cross-Runtime Compatibility**
- All tests must work on Node.js, Bun, and Deno
- Use poku as the primary test runner for cross-runtime support
- Isolate runtime-specific code in utility functions
- Test runtime detection and compatibility layers

### 2. **Property-Based Testing First**
- Use fast-check for property-based testing of core functions
- Generate comprehensive test cases automatically
- Focus on edge cases and boundary conditions
- Validate invariants and mathematical properties

### 3. **Comprehensive Coverage**
- Unit tests for individual functions
- Integration tests for component interactions
- Property-based tests for algorithmic functions
- End-to-end tests for complete workflows

## 📝 Test File Organization

### File Naming Conventions

```
✅ GOOD: Consistent test file naming
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
└── validation/
    ├── plugin-validator.ts
    ├── plugin-validator.test.ts
    └── plugin-validator.property.test.ts

❌ BAD: Inconsistent test organization
src/
├── core/
│   ├── generate-proto-plugin.ts
│   ├── test-generate-proto-plugin.ts    # Wrong prefix
│   └── generateProtoPlugin.spec.ts      # Wrong naming style
└── __tests__/                           # Separate test directory
    └── github-utils.test.ts
```

### Test Structure

```typescript
// ✅ GOOD: Consistent test structure with poku
import { describe, it, beforeEach, afterEach } from 'poku';
import { fc } from 'fast-check';
import { expect } from '../test-utils/assertions.ts';

describe('parseGitHubUrl', () => {
  // Unit tests first
  describe('unit tests', () => {
    it('should parse valid GitHub URLs', () => {
      const result = parseGitHubUrl('https://github.com/owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should handle URLs with .git suffix', () => {
      const result = parseGitHubUrl('https://github.com/owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should throw for invalid URLs', () => {
      expect(() => parseGitHubUrl('invalid-url')).toThrow(ValidationError);
    });
  });

  // Property-based tests second
  describe('property-based tests', () => {
    it('should always return valid owner and repo for valid URLs', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 1, maxLength: 39 }).filter(s => /^[a-zA-Z0-9-]+$/.test(s)),
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => /^[a-zA-Z0-9-_.]+$/.test(s)),
        (owner, repo) => {
          const url = `https://github.com/${owner}/${repo}`;
          const result = parseGitHubUrl(url);
          
          expect(result.owner).toBe(owner);
          expect(result.repo).toBe(repo);
          expect(typeof result.owner).toBe('string');
          expect(typeof result.repo).toBe('string');
          expect(result.owner.length).toBeGreaterThan(0);
          expect(result.repo.length).toBeGreaterThan(0);
        }
      ));
    });
  });
});
```

## 🧪 Property-Based Testing Patterns

### 1. **Input Generation**

```typescript
// ✅ GOOD: Well-constrained input generation
import { fc } from 'fast-check';

// GitHub repository names
const githubOwnerArb = fc.string({ minLength: 1, maxLength: 39 })
  .filter(s => /^[a-zA-Z0-9-]+$/.test(s) && !s.startsWith('-') && !s.endsWith('-'));

const githubRepoArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => /^[a-zA-Z0-9-_.]+$/.test(s));

// Semantic versions
const semverArb = fc.tuple(
  fc.integer({ min: 0, max: 999 }),
  fc.integer({ min: 0, max: 999 }),
  fc.integer({ min: 0, max: 999 })
).map(([major, minor, patch]) => `${major}.${minor}.${patch}`);

// Proto plugin configurations
const protoPluginArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-z0-9-]+$/.test(s)),
  version: semverArb,
  platform: fc.constantFrom('linux', 'macos', 'windows'),
  type: fc.constantFrom('binary', 'language', 'tool'),
});

// ❌ BAD: Unconstrained generation
const badStringArb = fc.string(); // Too broad, includes invalid characters
const badNumberArb = fc.integer(); // No bounds, can cause overflow
```

### 2. **Property Validation**

```typescript
// ✅ GOOD: Comprehensive property validation
describe('generateProtoPlugin property tests', () => {
  it('should always generate valid plugin names', () => {
    fc.assert(fc.property(
      githubOwnerArb,
      githubRepoArb,
      (owner, repo) => {
        const plugin = generateProtoPlugin({ owner, repo });
        
        // Name should be valid
        expect(plugin.name).toMatch(/^[a-z0-9-]+$/);
        expect(plugin.name.length).toBeGreaterThan(0);
        expect(plugin.name.length).toBeLessThanOrEqual(50);
        
        // Should not start or end with hyphen
        expect(plugin.name).not.toMatch(/^-|-$/);
      }
    ));
  });

  it('should preserve semantic version format', () => {
    fc.assert(fc.property(
      semverArb,
      (version) => {
        const plugin = generateProtoPlugin({ version });
        
        // Version should remain valid semver
        expect(plugin.version).toMatch(/^\d+\.\d+\.\d+/);
        
        // Should be parseable
        const parsed = parseSemanticVersion(plugin.version);
        expect(parsed).toBeDefined();
      }
    ));
  });

  it('should maintain platform consistency', () => {
    fc.assert(fc.property(
      fc.array(fc.constantFrom('linux', 'macos', 'windows'), { minLength: 1 }),
      (platforms) => {
        const plugin = generateProtoPlugin({ supportedPlatforms: platforms });
        
        // All specified platforms should be present
        for (const platform of platforms) {
          expect(plugin.platform).toHaveProperty(platform);
        }
        
        // No extra platforms should be added
        const pluginPlatforms = Object.keys(plugin.platform);
        expect(pluginPlatforms.sort()).toEqual(platforms.sort());
      }
    ));
  });
});
```

### 3. **Invariant Testing**

```typescript
// ✅ GOOD: Testing mathematical and logical invariants
describe('complexity calculation invariants', () => {
  it('should never return negative complexity', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 0, maxLength: 10000 }),
      (code) => {
        const complexity = calculateComplexity(code);
        expect(complexity).toBeGreaterThanOrEqual(0);
      }
    ));
  });

  it('should be monotonic with code length', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 1000 }),
      fc.string({ minLength: 1, maxLength: 1000 }),
      (code1, code2) => {
        const complexity1 = calculateComplexity(code1);
        const complexity2 = calculateComplexity(code1 + code2);
        
        // Adding code should not decrease complexity
        expect(complexity2).toBeGreaterThanOrEqual(complexity1);
      }
    ));
  });

  it('should be deterministic', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 0, maxLength: 1000 }),
      (code) => {
        const complexity1 = calculateComplexity(code);
        const complexity2 = calculateComplexity(code);
        
        // Same input should always produce same output
        expect(complexity1).toBe(complexity2);
      }
    ));
  });
});
```

## 🔄 Cross-Runtime Testing

### 1. **Runtime Detection Tests**

```typescript
// ✅ GOOD: Cross-runtime compatibility testing
import { describe, it } from 'poku';
import { detectRuntime, isNode, isBun, isDeno } from '../utils/runtime.ts';

describe('runtime detection', () => {
  it('should detect current runtime correctly', () => {
    const runtime = detectRuntime();
    
    // Should be one of the supported runtimes
    expect(['node', 'bun', 'deno']).toContain(runtime);
    
    // Only one runtime should be detected as true
    const detections = [isNode(), isBun(), isDeno()];
    const trueCount = detections.filter(Boolean).length;
    expect(trueCount).toBe(1);
  });

  it('should provide consistent runtime information', () => {
    const runtime = detectRuntime();
    
    switch (runtime) {
      case 'node':
        expect(isNode()).toBe(true);
        expect(isBun()).toBe(false);
        expect(isDeno()).toBe(false);
        break;
      case 'bun':
        expect(isNode()).toBe(false);
        expect(isBun()).toBe(true);
        expect(isDeno()).toBe(false);
        break;
      case 'deno':
        expect(isNode()).toBe(false);
        expect(isBun()).toBe(false);
        expect(isDeno()).toBe(true);
        break;
    }
  });
});
```

### 2. **Cross-Runtime Integration Tests**

```typescript
// ✅ GOOD: Testing functionality across runtimes
describe('file operations cross-runtime', () => {
  it('should read and write files consistently', async () => {
    const runtime = detectRuntime();
    const testContent = 'test content';
    const testFile = `test-${Date.now()}.txt`;
    
    try {
      // Write file
      await writeFile(testFile, testContent);
      
      // Read file
      const readContent = await readFile(testFile);
      
      // Content should be identical across runtimes
      expect(readContent).toBe(testContent);
      
      console.log(`✅ File operations work on ${runtime}`);
      
    } finally {
      // Cleanup
      try {
        await removeFile(testFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('should handle path operations consistently', () => {
    const runtime = detectRuntime();
    
    // Test path joining
    const joined = joinPath('src', 'utils', 'file.ts');
    expect(joined).toContain('src');
    expect(joined).toContain('utils');
    expect(joined).toContain('file.ts');
    
    // Test path resolution
    const resolved = resolvePath('./src/../config/eslint.config.ts');
    expect(resolved).toContain('config');
    expect(resolved).toContain('eslint.config.ts');
    
    console.log(`✅ Path operations work on ${runtime}`);
  });
});
```

## 🎯 Test Generation Patterns

### 1. **Automated Test Case Generation**

```typescript
// ✅ GOOD: Generate test cases from examples
export function generateTestCases<T, R>(
  fn: (input: T) => R,
  examples: Array<{ input: T; expected: R; description: string }>
): void {
  describe(`${fn.name} generated tests`, () => {
    for (const { input, expected, description } of examples) {
      it(description, () => {
        const result = fn(input);
        expect(result).toEqual(expected);
      });
    }
  });
}

// Usage
const parseGitHubUrlExamples = [
  {
    input: 'https://github.com/owner/repo',
    expected: { owner: 'owner', repo: 'repo' },
    description: 'should parse standard GitHub URL'
  },
  {
    input: 'https://github.com/owner/repo.git',
    expected: { owner: 'owner', repo: 'repo' },
    description: 'should parse GitHub URL with .git suffix'
  },
  {
    input: 'https://github.com/owner/repo/',
    expected: { owner: 'owner', repo: 'repo' },
    description: 'should parse GitHub URL with trailing slash'
  },
];

generateTestCases(parseGitHubUrl, parseGitHubUrlExamples);
```

### 2. **Error Condition Testing**

```typescript
// ✅ GOOD: Comprehensive error testing
describe('error handling', () => {
  it('should throw appropriate errors for invalid inputs', () => {
    const invalidInputs = [
      { input: '', expectedError: ValidationError, description: 'empty string' },
      { input: 'not-a-url', expectedError: ValidationError, description: 'invalid URL' },
      { input: 'https://gitlab.com/owner/repo', expectedError: ValidationError, description: 'non-GitHub URL' },
      { input: 'https://github.com/owner', expectedError: ValidationError, description: 'missing repo' },
    ];

    for (const { input, expectedError, description } of invalidInputs) {
      it(`should throw ${expectedError.name} for ${description}`, () => {
        expect(() => parseGitHubUrl(input)).toThrow(expectedError);
      });
    }
  });

  it('should provide meaningful error messages', () => {
    try {
      parseGitHubUrl('invalid-url');
      fail('Expected function to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('invalid');
      expect(error.message).toContain('URL');
    }
  });
});
```

## 📊 Test Performance and Metrics

### 1. **Performance Testing**

```typescript
// ✅ GOOD: Performance benchmarking in tests
describe('performance tests', () => {
  it('should parse GitHub URLs efficiently', () => {
    const startTime = performance.now();
    const iterations = 10000;
    
    for (let i = 0; i < iterations; i++) {
      parseGitHubUrl(`https://github.com/owner${i}/repo${i}`);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const avgTime = duration / iterations;
    
    // Should parse URLs in reasonable time
    expect(avgTime).toBeLessThan(1); // Less than 1ms per parse
    
    console.log(`Parsed ${iterations} URLs in ${duration.toFixed(2)}ms (avg: ${avgTime.toFixed(4)}ms)`);
  });
});
```

### 2. **Test Coverage Validation**

```typescript
// ✅ GOOD: Validate test coverage of critical paths
describe('coverage validation', () => {
  it('should test all error paths', () => {
    const errorPaths = [
      'GITHUB_API_ERROR',
      'VALIDATION_ERROR',
      'NETWORK_ERROR',
      'RATE_LIMIT_ERROR',
    ];
    
    // Ensure each error path is tested
    for (const errorPath of errorPaths) {
      // Test specific error conditions
      expect(() => triggerError(errorPath)).toThrow();
    }
  });

  it('should test all supported platforms', () => {
    const platforms = ['linux', 'macos', 'windows'];
    
    for (const platform of platforms) {
      const result = generatePlatformConfig(platform);
      expect(result).toBeDefined();
      expect(result.platform).toBe(platform);
    }
  });
});
```

## 🚨 Testing Anti-Patterns

### 1. **Flaky Tests**

```typescript
// ❌ BAD: Time-dependent tests
it('should process quickly', () => {
  const start = Date.now();
  processData();
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(100); // Flaky!
});

// ✅ GOOD: Deterministic tests
it('should process data correctly', () => {
  const result = processData(testInput);
  expect(result).toEqual(expectedOutput);
});
```

### 2. **Overly Specific Tests**

```typescript
// ❌ BAD: Testing implementation details
it('should call fetch exactly once', () => {
  const fetchSpy = jest.spyOn(global, 'fetch');
  fetchGitHubData();
  expect(fetchSpy).toHaveBeenCalledTimes(1); // Too specific!
});

// ✅ GOOD: Testing behavior
it('should return GitHub data', async () => {
  const result = await fetchGitHubData();
  expect(result).toHaveProperty('owner');
  expect(result).toHaveProperty('repo');
});
```

## 📋 Testing Checklist

For every test file:

- [ ] **Cross-Runtime**: Works on Node.js, Bun, and Deno
- [ ] **Property-Based**: Includes property-based tests for algorithmic functions
- [ ] **Error Handling**: Tests all error conditions and edge cases
- [ ] **Performance**: Includes performance validation for critical paths
- [ ] **Deterministic**: Tests are reliable and not flaky
- [ ] **Descriptive**: Test names clearly describe what is being tested
- [ ] **Isolated**: Tests don't depend on external state or other tests
- [ ] **Comprehensive**: Covers all public APIs and critical functionality
- [ ] **Maintainable**: Tests are easy to understand and modify

## 🔗 Related Rules

- [Code Generation](./code-generation.md) - AI-assisted code generation patterns
- [TypeScript Standards](../coding-standards/typescript.md) - TypeScript-specific testing patterns
- [Cross-Runtime Compatibility](../project-patterns/cross-runtime.md) - Multi-runtime testing strategies

---

*These testing rules ensure comprehensive, reliable, and maintainable test coverage across all supported runtimes.*
