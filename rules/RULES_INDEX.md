# Proto Plugins AI Rules Index

This is a comprehensive index of all AI assistance rules and coding standards in the
proto-plugins project.

## 📚 Quick Reference

### 🤖 AI Assistance Rules

| Rule | Purpose | Key Patterns |
|------|---------|--------------|
| [Code Generation](ai-assistance/code-generation.md) | TypeScript code generation patterns | Type safety, error handling, cross-runtime |
| [Testing](ai-assistance/testing.md) | Test generation and strategies | Property-based testing, cross-runtime, poku |
| [Documentation](ai-assistance/documentation.md) | Documentation standards | JSDoc, README patterns, API docs |
| [Workflow Automation](ai-assistance/workflow-automation.md) | CI/CD and automation | GitHub workflows, proto integration |

### 💻 Coding Standards

| Standard | Scope | Key Rules |
|----------|-------|-----------|
| [TypeScript](coding-standards/typescript.md) | Language-specific rules | Strict mode, explicit types, modern features |
| [Naming Conventions](coding-standards/naming-conventions.md) | Identifier naming | kebab-case files, camelCase variables, PascalCase types |
| [File Organization](coding-standards/file-organization.md) | Project structure | Directory layout, import patterns, module boundaries |
| [Error Handling](coding-standards/error-handling.md) | Error management | Custom error classes, context preservation |

### 🔧 Project Patterns

| Pattern | Domain | Key Concepts |
|---------|--------|--------------|
| [Plugin Generation](project-patterns/plugin-generation.md) | GitHub → Proto | Asset detection, platform support, validation |
| [Cross-Runtime](project-patterns/cross-runtime.md) | Multi-runtime support | Node.js/Bun/Deno compatibility |
| [GitHub Integration](project-patterns/github-integration.md) | API usage | Rate limiting, error handling, caching |
| [Proto Toolchain](project-patterns/proto-toolchain.md) | Tool integration | Installation, testing, version management |

### ✅ Quality Assurance

| Process | Focus | Tools |
|---------|-------|-------|
| [Code Review](quality-assurance/code-review.md) | Review guidelines | Checklists, automated checks |
| [Automated Analysis](quality-assurance/automated-analysis.md) | Static analysis | Complexity metrics, dependency analysis |
| [Performance](quality-assurance/performance.md) | Optimization | Caching, benchmarking, profiling |
| [Security](quality-assurance/security.md) | Security practices | Vulnerability scanning, secrets management |

## 🎯 Rule Categories by Use Case

### 🚀 Starting a New Feature

1. **Read**: [Code Generation](ai-assistance/code-generation.md) for patterns
2. **Follow**: [TypeScript Standards](coding-standards/typescript.md) for implementation
3. **Apply**: [Naming Conventions](coding-standards/naming-conventions.md) for identifiers
4. **Test**: [Testing Rules](ai-assistance/testing.md) for validation

### 🔧 Plugin Development

1. **Study**: [Plugin Generation](project-patterns/plugin-generation.md) for workflows
2. **Implement**: [GitHub Integration](project-patterns/github-integration.md) for API usage
3. **Ensure**: [Cross-Runtime](project-patterns/cross-runtime.md) compatibility
4. **Validate**: [Proto Toolchain](project-patterns/proto-toolchain.md) integration

### 🧪 Testing Strategy

1. **Structure**: [Testing Rules](ai-assistance/testing.md) for organization
2. **Generate**: Property-based tests with fast-check
3. **Validate**: Cross-runtime compatibility with poku
4. **Measure**: Performance and coverage metrics

### 📝 Documentation
1. **Format**: [Documentation Standards](ai-assistance/documentation.md)
2. **Generate**: API documentation automatically
3. **Maintain**: Version-specific documentation
4. **Review**: Community contribution guidelines

## 🔄 Rule Evolution Process

### 1. **Identifying New Patterns**
- Code review feedback reveals recurring patterns
- Performance analysis suggests optimizations
- Community input highlights missing guidelines
- Tool updates require pattern adjustments

### 2. **Rule Development**
- Draft new rule following established format
- Include examples and anti-patterns
- Add cross-references to related rules
- Validate with existing codebase

### 3. **Community Review**
- Create issue describing proposed rule
- Gather feedback from maintainers
- Iterate based on community input
- Document rationale and benefits

### 4. **Implementation**
- Add rule to appropriate category
- Update related rules with cross-references
- Update this index with new rule
- Communicate changes to team

## 📊 Rule Compliance Metrics

### Automated Checks
- **ESLint**: Enforces coding standards automatically
- **TypeScript**: Validates type safety and modern patterns
- **Knip**: Detects dead code and unused dependencies
- **Trunk**: Runs comprehensive linting suite

### Manual Reviews
- **Code Review Checklist**: Validates rule compliance
- **Architecture Review**: Ensures pattern consistency
- **Performance Review**: Checks optimization guidelines
- **Security Review**: Validates security practices

## 🎓 Learning Path for New Contributors

### Week 1: Foundations
- [ ] Read [README](README.md) for overview
- [ ] Study [TypeScript Standards](coding-standards/typescript.md)
- [ ] Learn [Naming Conventions](coding-standards/naming-conventions.md)
- [ ] Practice with simple utility functions

### Week 2: Testing
- [ ] Master [Testing Rules](ai-assistance/testing.md)
- [ ] Write property-based tests with fast-check
- [ ] Test across Node.js, Bun, and Deno
- [ ] Understand cross-runtime patterns

### Week 3: Project Patterns
- [ ] Study [Plugin Generation](project-patterns/plugin-generation.md)
- [ ] Learn [GitHub Integration](project-patterns/github-integration.md)
- [ ] Practice with [Proto Toolchain](project-patterns/proto-toolchain.md)
- [ ] Implement end-to-end workflow

### Week 4: Advanced Topics
- [ ] Master [Code Generation](ai-assistance/code-generation.md)
- [ ] Understand [Performance](quality-assurance/performance.md) patterns
- [ ] Learn [Security](quality-assurance/security.md) practices
- [ ] Contribute to rule improvements

## 🔗 External Resources

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TypeScript ESLint Rules](https://typescript-eslint.io/rules/)
- [Utility Types Reference](https://www.typescriptlang.org/docs/handbook/utility-types.html)

### Testing
- [Fast-Check Documentation](https://fast-check.dev/)
- [Poku Test Runner](https://poku.io/)
- [Property-Based Testing Guide](https://hypothesis.works/articles/what-is-property-based-testing/)

### Proto Toolchain
- [Proto Documentation](https://moonrepo.dev/proto)
- [Proto Plugin Schema](https://moonrepo.dev/docs/proto/plugins)
- [Proto Configuration](https://moonrepo.dev/docs/proto/config)

### GitHub API
- [GitHub REST API](https://docs.github.com/en/rest)
- [GitHub Rate Limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting)
- [GitHub Webhooks](https://docs.github.com/en/developers/webhooks-and-events/webhooks)

## 📈 Success Metrics

### Code Quality
- **Type Safety**: 100% TypeScript strict mode compliance
- **Test Coverage**: >90% line coverage across all runtimes
- **Dead Code**: 0% unused code detected by knip
- **Linting**: 0 ESLint errors, minimal warnings

### Developer Experience
- **Onboarding Time**: New contributors productive within 1 week
- **Rule Clarity**: <5% of code reviews require rule clarification
- **Automation**: >80% of quality checks automated
- **Documentation**: All public APIs documented

### Project Health
- **Consistency**: 100% adherence to naming conventions
- **Performance**: No performance regressions
- **Security**: 0 high-severity vulnerabilities
- **Maintainability**: Complexity metrics within acceptable ranges

## 🤝 Contributing to Rules

### Adding New Rules
1. **Identify Need**: Document why the rule is needed
2. **Research**: Study existing patterns and best practices
3. **Draft**: Write rule following established format
4. **Validate**: Test rule against existing codebase
5. **Review**: Get feedback from maintainers
6. **Implement**: Add rule and update index

### Improving Existing Rules
1. **Identify Issue**: Document problems with current rule
2. **Propose Solution**: Suggest specific improvements
3. **Gather Feedback**: Discuss with community
4. **Update**: Modify rule and related documentation
5. **Communicate**: Announce changes to team

### Rule Format Standards
- **Clear Title**: Descriptive rule name
- **Purpose Statement**: Why the rule exists
- **Examples**: Good and bad code examples
- **Rationale**: Explanation of benefits
- **Cross-References**: Links to related rules
- **Checklist**: Validation criteria

---

*This index is maintained automatically and updated whenever rules are added or modified.*
