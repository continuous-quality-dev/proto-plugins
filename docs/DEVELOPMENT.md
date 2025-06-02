# Development Guide

## Project Structure

```
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

### 1. **Code Style**
- Use TypeScript strict mode
- Prefer explicit types
- Use meaningful variable names
- Add JSDoc comments for public APIs

### 2. **Testing**
- Write tests for all new features
- Use property-based testing for algorithms
- Test error conditions
- Maintain high test coverage

### 3. **Documentation**
- Update README for user-facing changes
- Add inline comments for complex logic
- Update this guide for architectural changes

### 4. **Performance**
- Minimize external dependencies
- Use streaming for large files
- Cache expensive operations
- Profile critical paths

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
