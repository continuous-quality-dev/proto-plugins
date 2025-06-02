# Proto Plugins AI Assistance Rules

This directory contains the codified rules, patterns, and guidelines for AI assistance in the proto-plugins project. These rules ensure consistency, quality, and maintainability across all AI-assisted development work.

## 📁 Directory Structure

```
rules/
├── README.md                    # This file - overview and index
├── ai-assistance/              # AI-specific rules and patterns
│   ├── code-generation.md      # Code generation guidelines
│   ├── documentation.md        # Documentation standards
│   ├── testing.md             # Testing patterns
│   └── workflow-automation.md  # CI/CD and automation rules
├── coding-standards/           # General coding standards
│   ├── typescript.md          # TypeScript conventions
│   ├── naming-conventions.md   # Naming patterns
│   ├── file-organization.md    # File structure rules
│   └── error-handling.md       # Error handling patterns
├── project-patterns/           # Project-specific patterns
│   ├── plugin-generation.md    # Plugin generation rules
│   ├── cross-runtime.md        # Multi-runtime compatibility
│   ├── github-integration.md   # GitHub API patterns
│   └── proto-toolchain.md      # Proto toolchain integration
└── quality-assurance/          # Quality and validation rules
    ├── code-review.md          # Code review guidelines
    ├── automated-analysis.md   # Automated analysis patterns
    ├── performance.md          # Performance considerations
    └── security.md             # Security guidelines
```

## 🎯 Purpose

These rules serve multiple purposes:

1. **Consistency**: Ensure all AI-assisted code follows the same patterns
2. **Quality**: Maintain high code quality standards across the project
3. **Onboarding**: Help new contributors understand project conventions
4. **Automation**: Enable better automated code generation and validation
5. **Documentation**: Preserve institutional knowledge about development patterns

## 🚀 Quick Start

### For AI Assistants

When working on this project, always:

1. **Read the relevant rules** before starting any task
2. **Follow the established patterns** documented in this directory
3. **Update rules** when introducing new patterns or conventions
4. **Validate compliance** with existing standards

### For Human Developers

1. **Reference these rules** when reviewing AI-generated code
2. **Suggest updates** when patterns evolve or new needs arise
3. **Use as templates** for manual development work
4. **Maintain consistency** with documented standards

## 📋 Rule Categories

### 🤖 AI Assistance Rules
- **Code Generation**: Patterns for generating TypeScript, configuration files, and documentation
- **Documentation**: Standards for README files, API docs, and inline comments
- **Testing**: Property-based testing patterns and cross-runtime test strategies
- **Workflow Automation**: CI/CD patterns and GitHub workflow generation

### 💻 Coding Standards
- **TypeScript**: Type definitions, module patterns, and language features
- **Naming Conventions**: File names, function names, variable names, and constants
- **File Organization**: Directory structure, import patterns, and module boundaries
- **Error Handling**: Custom error types, error propagation, and user-friendly messages

### 🔧 Project Patterns
- **Plugin Generation**: GitHub release parsing, proto plugin format, and validation
- **Cross-Runtime**: Node.js/Bun/Deno compatibility patterns
- **GitHub Integration**: API usage, rate limiting, and error handling
- **Proto Toolchain**: Installation, testing, and version management

### ✅ Quality Assurance
- **Code Review**: Review checklists, automated checks, and quality gates
- **Automated Analysis**: Complexity metrics, dependency analysis, and diagram generation
- **Performance**: Optimization patterns, caching strategies, and benchmarking
- **Security**: Dependency scanning, secrets management, and vulnerability handling

## 🔄 Rule Evolution

These rules are living documents that evolve with the project:

- **Regular Updates**: Rules are updated as new patterns emerge
- **Community Input**: Contributors can suggest improvements via issues or PRs
- **Version Control**: All changes are tracked in git for transparency
- **Backward Compatibility**: Changes maintain compatibility with existing code

## 📖 Usage Examples

### Example 1: Generating a New Service

```typescript
// ✅ Follows rules/project-patterns/github-integration.md
export class GitHubService {
  private readonly baseUrl = 'https://api.github.com';
  
  async fetchRelease(owner: string, repo: string): Promise<GitHubRelease> {
    // Implementation follows error handling patterns
  }
}
```

### Example 2: Creating Tests

```typescript
// ✅ Follows rules/ai-assistance/testing.md
import { fc } from 'fast-check';

describe('parseGitHubUrl', () => {
  it('should parse valid GitHub URLs', () => {
    fc.assert(fc.property(
      fc.string(), fc.string(),
      (owner, repo) => {
        // Property-based test implementation
      }
    ));
  });
});
```

## 🤝 Contributing to Rules

To add or modify rules:

1. **Create an issue** describing the new pattern or change needed
2. **Draft the rule** following the established format
3. **Get feedback** from maintainers and community
4. **Submit a PR** with the new or updated rule
5. **Update related documentation** as needed

## 📚 Related Documentation

- [Development Guide](../docs/DEVELOPMENT.md) - General development workflow
- [Contributing Guidelines](../CONTRIBUTING.md) - How to contribute to the project
- [Architecture Overview](../docs/ARCHITECTURE.md) - High-level project architecture
- [API Documentation](../docs/API.md) - Generated API documentation

---

*These rules are maintained by the proto-plugins community and updated regularly to reflect best practices and emerging patterns.*
