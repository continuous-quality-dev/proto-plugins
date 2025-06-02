# Property-Based Testing with fast-check and poku

This project includes comprehensive property-based tests using [fast-check](https://github.com/dubzzz/fast-check) for property-based testing and [poku](https://github.com/wellwelwel/poku) for cross-runtime test execution.

## Overview

Property-based testing is a testing methodology where you define properties (invariants) that should hold for a wide range of inputs, rather than testing specific examples. The testing framework then generates many random inputs to verify these properties.

## Test Structure

### Property-Based Test Files

- `scripts/shared-utils.property.test.ts` - Property tests for shared utility functions
- `src/test-proto-plugin.property.test.ts` - Property tests for proto plugin functionality

### Regular Test Files

- `src/test-proto-plugin.test.ts` - Traditional unit tests
- `scripts/generate-proto-plugin.test.ts` - Unit tests for plugin generation
- `scripts/generate-proto-plugin.property.test.ts` - Property tests for plugin generation

## Running Tests

### All Tests (Unit + Property-Based)

```bash
# Run all tests across all runtimes
npm run test

# Run tests for specific runtime
npm run test:node
npm run test:bun
npm run test:deno
```

### Property-Based Tests Only

```bash
# Run property tests across all runtimes
npm run test:property

# Run property tests for specific runtime
npm run test:property:node
npm run test:property:bun
npm run test:property:deno
```

### Test Summary

```bash
# Generate detailed test summary with performance metrics
npm run test:summary
```

This generates `TEST_SUMMARY.md` with:
- Cross-runtime performance comparison
- Individual test execution times
- Property-based test insights
- Test coverage statistics

## Property-Based Test Examples

### URL Parsing Properties

```typescript
it("should parse valid GitHub URLs consistently", () => {
  const validGitHubUrlGenerator = fc.record({
    owner: fc.string({ minLength: 1, maxLength: 39 })
      .filter((s) => /^[a-zA-Z0-9-]+$/.test(s)),
    repo: fc.string({ minLength: 1, maxLength: 100 })
      .filter((s) => /^[a-zA-Z0-9._-]+$/.test(s)),
    suffix: fc.oneof(
      fc.constant(""),
      fc.constant("/releases"),
      fc.constant(".git")
    ),
  });

  fc.assert(
    fc.property(validGitHubUrlGenerator, ({ owner, repo, suffix }) => {
      const url = `https://github.com/${owner}/${repo}${suffix}`;
      const parsed = parseGitHubUrl(url);

      // Properties that should always hold
      assert(parsed.owner === owner, "Owner should match input");
      assert(parsed.repo === repo.replace(/\.git$/, ""), "Repo should match input");
      assert(parsed.owner.length > 0, "Owner should not be empty");
      assert(parsed.repo.length > 0, "Repo should not be empty");
    }),
    { numRuns: 100 }
  );
});
```

### Argument Parsing Properties

```typescript
it("should correctly identify flags in argument arrays", () => {
  const flagGenerator = fc.string({ minLength: 1, maxLength: 20 })
    .filter(s => /^[a-zA-Z0-9-_]+$/.test(s));
  
  const argsGenerator = fc.array(
    fc.string({ minLength: 1, maxLength: 30 }),
    { minLength: 0, maxLength: 10 }
  );

  fc.assert(
    fc.property(flagGenerator, argsGenerator, (flag, args) => {
      // Test when flag is present
      const argsWithFlag = [...args, flag];
      const resultWithFlag = hasFlag(argsWithFlag, flag);
      assert(resultWithFlag === true, "Should return true when flag is present");

      // Test when flag is not present
      const argsWithoutFlag = args.filter(arg => arg !== flag);
      const resultWithoutFlag = hasFlag(argsWithoutFlag, flag);
      assert(resultWithoutFlag === false, "Should return false when flag is not present");
    }),
    { numRuns: 100 }
  );
});
```

## Test Summary Features

The test summary (`TEST_SUMMARY.md`) includes:

### Runtime Performance Comparison
- Execution time across Node.js, Bun, and Deno
- Success/failure status per runtime
- Performance insights and speed comparisons

### Property-Based Test Insights
- Total property tests executed
- Total property runs (sum of all numRuns across tests)
- Average runs per property test
- Cross-runtime property test coverage

### Individual Test Performance
- Detailed timing for each test
- Cross-runtime performance comparison
- Fastest and slowest tests identification

## Benefits of Property-Based Testing

1. **Broader Coverage**: Tests many more input combinations than manual examples
2. **Edge Case Discovery**: Automatically finds edge cases you might not think of
3. **Regression Prevention**: Properties serve as invariants that must always hold
4. **Documentation**: Properties describe what the code should do in a declarative way

## Test Configuration

### fast-check Configuration

Tests use various `numRuns` values based on complexity:
- Simple property tests: 50-100 runs
- Complex property tests: 20-50 runs
- Environment-dependent tests: 10 runs

### poku Configuration

Cross-runtime compatibility is ensured through:
- Shared test files that work across Node.js, Bun, and Deno
- Runtime-specific adaptations where needed
- Consistent assertion patterns

## Adding New Property Tests

1. Create generators for your input data using `fc.*` functions
2. Define properties (invariants) that should always hold
3. Use `fc.assert(fc.property(...))` to test the properties
4. Add appropriate filters to ensure valid input generation
5. Choose appropriate `numRuns` based on test complexity

Example template:

```typescript
it("should maintain property X for all valid inputs", () => {
  const inputGenerator = fc.record({
    field1: fc.string({ minLength: 1 }),
    field2: fc.integer({ min: 0, max: 100 })
  });

  fc.assert(
    fc.property(inputGenerator, (input) => {
      const result = functionUnderTest(input);
      
      // Define your properties here
      assert(result.someProperty === expectedValue, "Property should hold");
      assert(result.anotherProperty > 0, "Another property should hold");
    }),
    { numRuns: 100 }
  );
});
```

## Cross-Runtime Compatibility

All property-based tests are designed to work across:
- **Node.js** (with experimental TypeScript support)
- **Bun** (native TypeScript support)
- **Deno** (native TypeScript support)

The test summary automatically detects and reports on property-based tests, providing insights into test coverage and performance across all supported runtimes.
