# TODO

## Remaining Core Tasks

1. **Add logging service with different levels** - Centralized logging with configurable levels
2. **Create plugin templates for common patterns** - Standardized plugin scaffolding
3. **Create integration tests with real GitHub repos** - End-to-end testing
4. **Add caching layer for GitHub API calls** - Performance optimization
   - Implement with unstorage and save cache to action cache or artifact
   - Local runs should get cache from GitHub or artifact
5. **Add performance monitoring and metrics** - Track system performance
6. **Add plugin dependency management** - Handle plugin interdependencies
7. **Implement plugin versioning strategies** - Version compatibility management
8. **Implement plugin registry management** - Centralized plugin discovery
9. **Add support for plugins with multiple binaries** - Complex plugin architectures
10. **Add support for plugins with different versioning schemes** - Flexible versioning
11. **Add support for plugins with different installation methods** - Multiple install strategies
12. **Add support for plugins with different architectures** - Cross-platform support
✅ 13. **Make a rules directory and codify AI rules** - Document AI assistance patterns
1. **Use vltpkg/reproduce for repository validation** - (blocked: Node.js compatibility)

## Recommended Additional Improvements

### 🔧 Developer Experience & Tooling

1. **Add pre-commit hooks with husky** - Ensure code quality before commits
1. **Implement semantic versioning with conventional commits** - Automated changelog and releases
1. **Add commitizen for standardized commit messages** - Consistent commit format
1. **Create development containers (devcontainer)** - Consistent development environment
1. **Add VS Code workspace configuration** - Optimized editor settings and extensions

### 📊 Monitoring & Analytics

1. **Implement bundle size analysis** - Track and optimize package sizes
1. **Add performance benchmarking** - Monitor script execution times
1. **Create dependency vulnerability scanning** - Security monitoring
1. **Add code coverage reporting** - Track test coverage metrics
1. **Implement build time optimization tracking** - Monitor CI/CD performance

### 🚀 Automation & CI/CD

1. **Add automatic dependency updates with grouping** - Smart dependency management
1. **Implement release automation** - Automated releases with changelogs
1. **Add plugin compatibility matrix testing** - Test plugins across tool versions
1. **Create nightly builds and testing** - Continuous integration improvements
1. **Add performance regression testing** - Prevent performance degradation

### 📚 Documentation & Community

1. **Generate API documentation automatically** - Keep docs in sync with code
1. **Add interactive plugin examples** - Better onboarding experience
1. **Create plugin development guide** - Community contribution guidelines
1. **Add troubleshooting documentation** - Common issues and solutions
1. **Implement documentation versioning** - Version-specific documentation

### 🔒 Security & Compliance

1. **Add SAST (Static Application Security Testing)** - Security vulnerability scanning
1. **Implement supply chain security** - Verify dependency integrity
1. **Add license compliance checking** - Ensure license compatibility
1. **Create security policy and reporting** - Security vulnerability disclosure
1. **Add secrets scanning** - Prevent credential leaks

### 🏗️ Architecture & Scalability

1. **Implement plugin caching system** - Improve performance
1. **Add plugin validation framework** - Ensure plugin quality
1. **Create plugin marketplace/registry** - Centralized plugin discovery
1. **Add plugin analytics and usage tracking** - Understand plugin adoption
1. **Implement plugin sandboxing** - Security isolation for plugins

### 🧪 Testing & Quality

1. **Add mutation testing** - Improve test quality
1. **Implement visual regression testing** - UI/output consistency
1. **Add chaos engineering tests** - System resilience testing
1. **Create integration test matrix** - Cross-platform compatibility
1. **Add property-based testing expansion** - More comprehensive test coverage

### 🌐 Cross-Platform & Compatibility

1. **Add Windows-specific optimizations** - Better Windows support
1. **Implement ARM64 native support** - Apple Silicon optimization
1. **Add container-based testing** - Isolated test environments
1. **Create cross-runtime benchmarks** - Performance comparison across runtimes
1. **Add mobile/edge platform support** - Expand platform coverage

## Done

✅ 1. migrate to pnpm
✅ 2. move the danger readme to the docs folder
✅ 3. move the property testing readme to the docs folder
✅ 4. migrate config files to a config folder in the root of the workspace
✅ 5. add a renovate config
✅ 6. create a eslint config with typescript support
✅ 7. update to node 24
✅ 8. update github workflows to use pnpm and proto toolchain
✅ 9. implement multi-architecture testing workflows
✅ 10. create automated plugin generation workflow
✅ 11. add eslint-plugin-depend for dependency management
✅ 12. add knip for dead code detection
✅ 13. integrate trunk for unified linting
✅ 14. update the workflows to test multi architectures
✅ 15. the github workflows should install pnpm from the moonrepo/setup-toolchain
✅ 16. create a workflow that accepts a owner/repo and generates a plugin and creates a PR
✅ 17. create a eslint config with typescript support and eslint-plugin-depend
✅ 18. add knip.dev
