# Proto Plugin Testing Workflows

This directory contains GitHub Actions workflows for testing proto plugin configurations across multiple operating systems.

## Workflows

### 1. `test-plugins.yml` - Comprehensive Plugin Testing

**Purpose**: Automatically tests all JSON plugins across multiple operating systems using a matrix strategy.

**Triggers**:

- Push to `main` or `feat/grit` branches (when plugin files change)
- Pull requests to `main` (when plugin files change)
- Weekly schedule (Sundays at 2 AM UTC)
- Manual dispatch with custom plugin pattern

**Features**:

- **Matrix Strategy**: Tests each plugin on Ubuntu, macOS, and Windows
- **Auto-Discovery**: Finds all `*auto.json` plugins automatically
- **10-minute timeout** per plugin test (increased for reliability)
- **Parallel Execution**: All plugin/OS combinations run simultaneously
- **Comprehensive Logging**: Detailed test output and failure debugging
- **Fail-Safe**: Continues testing other combinations on failure

**Matrix Combinations**:

- **13 plugins** × **3 operating systems** = **39 test jobs**
- Each job tests one plugin on one OS independently
- Maximum parallelization for fastest feedback

**Usage**:

```bash
# Automatically triggered on push/PR
# Or manually trigger with custom pattern:
# Go to Actions → Test Proto Plugins → Run workflow
# Plugin pattern: "d2*" (test only D2-related plugins)
```

### 2. `batch-test-plugins.yml` - Batch Testing on Single OS

**Purpose**: Test multiple plugins on a single operating system with custom configuration.

**Triggers**:

- Manual dispatch only

**Features**:

- Choose specific OS (Ubuntu, macOS, or Windows)
- Custom plugin pattern matching
- Configurable timeout per plugin
- Batch execution with progress tracking
- Detailed success/failure reporting

**Usage**:

```bash
# Go to Actions → Batch Test Proto Plugins → Run workflow
# Select:
# - OS: ubuntu-latest, macos-latest, or windows-latest
# - Plugin pattern: "*auto.json", "d2-auto.json", etc.
# - Timeout: 10 minutes (default)
```

### 3. `test-single-plugin.yml` - Individual Plugin Testing

**Purpose**: Test a specific plugin across one or all operating systems.

**Triggers**:

- Manual dispatch only

**Features**:

- Test specific plugin file
- Choose single OS or test on all OSes
- Optional specific version testing
- Plugin integration testing
- Detailed individual plugin analysis

**Usage**:

```bash
# Go to Actions → Test Single Proto Plugin → Run workflow
# Specify:
# - Plugin file: "proto/d2-auto.json"
# - OS: "all" or specific OS
# - Version: "0.7.0" (optional)
```

## Test Process

Each workflow follows this testing process:

1. **Environment Setup**:

   - Install Node.js 22.6.0
   - Install npm dependencies
   - Install Proto tool manager

2. **Plugin Testing**:

   - Load plugin configuration
   - Install tool using proto
   - Test tool execution with version detection
   - Verify tool functionality
   - Clean up installation

3. **Integration Testing**:

   - Copy plugin to proto plugins directory
   - Test proto recognition
   - Verify installation persistence

4. **Reporting**:
   - Generate test summaries
   - Report success/failure rates
   - Provide debugging information on failures

## Plugin Requirements

For plugins to pass the automated tests, they must:

1. **Valid JSON Structure**: Follow proto plugin JSON schema
2. **Correct Download URLs**: Point to valid GitHub release assets
3. **Proper Architecture Mapping**: Support common architectures (x86_64, aarch64)
4. **Version Detection**: Tool must support `--version`, `-v`, or `version` commands
5. **Cross-Platform**: Work on Linux, macOS, and Windows

## Debugging Failed Tests

When tests fail, check:

1. **Plugin Configuration**:

   - Verify download URLs are correct
   - Check architecture mappings
   - Validate binary paths

2. **Tool Compatibility**:

   - Ensure tool supports version detection
   - Check if tool requires specific arguments
   - Verify tool works on target OS

3. **GitHub API Limits**:

   - Rate limiting may cause version detection failures
   - Use specific version testing to bypass API calls

4. **Network Issues**:
   - Download timeouts
   - Connectivity problems
   - GitHub release asset availability

## Adding New Plugins

When adding new plugins:

1. **Generate JSON**: Use `npm run generate-auto -- <github-url>`
2. **Test Locally**: Run `npm run test-plugin-with-proto -- <plugin-file>`
3. **Test in CI**: Use single plugin workflow for validation
4. **Update .prototools**: Add plugin reference
5. **Commit Changes**: Automatic testing will run on push

## Workflow Configuration

### Environment Variables

- `NODE_VERSION`: Node.js version (22.6.0)

### Timeouts

- **Matrix Plugin Test**: 10 minutes (600 seconds)
- **Single Plugin Test**: 5 minutes (300 seconds)
- **Batch Test**: Configurable (default 10 minutes)
- **Installation Test**: 30 seconds

### Matrix Strategy

- **OS Matrix**: `[ubuntu-latest, macos-latest, windows-latest]`
- **Fail Fast**: Disabled (continue testing other combinations on failure)

## Monitoring

- **Weekly Schedule**: Catches version updates and breaking changes
- **PR Testing**: Validates new plugins before merge
- **Manual Testing**: Allows targeted testing of specific plugins

## Troubleshooting

### Common Issues

1. **Timeout Errors**: Increase timeout or test with specific version
2. **Architecture Mismatches**: Update arch mapping in plugin JSON
3. **Download Failures**: Verify GitHub release asset names
4. **Permission Errors**: Check binary executable permissions
5. **Version Detection**: Ensure tool supports standard version flags

### Getting Help

- Check workflow logs for detailed error messages
- Use debug mode for additional information
- Test plugins locally before CI
- Review plugin JSON schema documentation
