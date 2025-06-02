# Development Guide

## 📚 Development Standards

**IMPORTANT**: This project follows standards documented in the [`rules/`](../rules/) directory.

### Quick Reference

- [**AI Assistance Rules**](../rules/README.md) - Complete overview of patterns
- [**Rules Index**](../rules/RULES_INDEX.md) - Quick reference and learning paths
- [**Code Generation**](../rules/ai-assistance/code-generation.md) - TypeScript patterns
- [**Testing Guidelines**](../rules/ai-assistance/testing.md) - Property-based testing
- [**TypeScript Standards**](../rules/coding-standards/typescript.md) - Language
- [**Naming Conventions**](../rules/coding-standards/naming-conventions.md) - Naming

### Core Principles

- **Type Safety First**: TypeScript strict mode, explicit types, no `any`
- **Cross-Runtime Compatibility**: Support Node.js, Bun, and Deno
- **Property-Based Testing**: Use fast-check for algorithmic functions
- **Error Handling**: Custom error classes with meaningful context
- **Code Quality**: ESLint, knip, and trunk for automated validation

## Project Structure

```text
src/
├── analysis/           # Complexity analysis and metrics
├── cli/               # CLI commands and interfaces
├── config/            # Configuration management
├── constants/         # Application constants
├── core/              # Main application logic
├── diagrams/          # Diagram generation
├── services/          # External service integrations
├── types/             # Type definitions
├── utils/             # Shared utilities
└── validation/        # Validation logic
```

## Development Workflow

### 1. Setup

```bash
# Install dependencies
make install

# Setup development environment
make setup
```

### 2. Development

```bash
# Quick development check
make quick

# Generate plugin interactively
make generate

# Generate plugin automatically
make generate-auto
```

### 3. Testing

```bash
# Run all tests
make test

# Test specific runtime
make test-node
make test-bun
make test-deno

# Test workflows
make test-workflows
```

### 4. Code Quality

```bash
# Lint code
make lint

# Format code
make format

# Validate workflows
make validate
```

## Architecture Principles

### 1. **Separation of Concerns**

- **Core**: Business logic
- **Services**: External integrations
- **CLI**: User interface
- **Utils**: Shared utilities
- **Validation**: Data validation

### 2. **Cross-Runtime Compatibility**

- Support Node.js, Bun, and Deno
- Use standard APIs when possible
- Runtime-specific code in utils

### 3. **Configuration Management**

- Centralized configuration in `src/config/`
- Environment-specific overrides
- Type-safe configuration

### 4. **Error Handling**

- Custom error types
- Consistent error messages
- Graceful degradation

### 5. **Testing Strategy**

- Unit tests co-located with source
- Property-based testing with fast-check
- Cross-runtime testing
- Integration tests with proto

## Adding New Features

### 1. **New CLI Command**

1. Create command in `src/cli/commands/`
2. Add types to `src/cli/types.ts`
3. Export from `src/cli/index.ts`
4. Add npm script to `package.json`
5. Add tests

### 2. **New Service Integration**

1. Create service in `src/services/`
2. Add configuration to `src/config/`
3. Add error types to `src/utils/errors.ts`
4. Add tests

### 3. **New Validation Rule**

1. Add to `src/validation/`
2. Update validator classes
3. Add error messages
4. Add tests

## Best Practices

### 1. **Follow Established Rules**

- **ALWAYS** consult the [`rules/`](../rules/) directory before making changes
- Follow [TypeScript Standards](../rules/coding-standards/typescript.md) for code
- Apply [Naming Conventions](../rules/coding-standards/naming-conventions.md)
- Use [Code Generation](../rules/ai-assistance/code-generation.md) patterns

### 2. **Code Style**

- Use TypeScript strict mode (enforced by rules)
- Prefer explicit types over `any`
- Use meaningful variable names
- Add JSDoc comments for public APIs

### 3. **Testing**

- Follow [Testing Guidelines](../rules/ai-assistance/testing.md) for all tests
- Write property-based tests with fast-check for algorithms
- Ensure cross-runtime compatibility (Node.js, Bun, Deno)
- Test error conditions and edge cases
- Maintain >90% test coverage

### 4. **Documentation**

- Update README for user-facing changes
- Add inline comments for complex logic
- Update this guide for architectural changes
- Follow documentation patterns in the rules

### 5. **Performance**

- Minimize external dependencies
- Use streaming for large files
- Cache expensive operations
- Profile critical paths
- Follow performance guidelines in the rules

## Debugging

### 1. **Enable Debug Logging**

```bash
DEBUG=* npm run generate
```

### 2. **Test Individual Components**

```bash
# Test specific file
npx poku src/core/generate-proto-plugin.test.ts
```

### 3. **Validate Plugin Output**

```bash
# Test generated plugin
proto install --from ./plugins/my-tool.json my-tool
proto run my-tool --version
```

## Release Process

1. Update version in `package.json`
2. Run full test suite: `make ci`
3. Generate documentation: `make docs`
4. Create release notes
5. Tag release
6. Push to GitHub

## Troubleshooting

### Common Issues

1. **Proto not found**: Install proto CLI
2. **Permission errors**: Check file permissions
3. **Network timeouts**: Check internet connection
4. **Test failures**: Run tests individually to isolate

### Getting Help

1. Check existing issues on GitHub
2. Review documentation
3. Ask in discussions
4. Create detailed bug report
