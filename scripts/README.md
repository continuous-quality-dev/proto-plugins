# Scripts Directory

This directory contains TypeScript scripts for managing proto plugin
configurations and testing workflows.

## Available Scripts

### Core Generation Scripts

#### `generate-proto-plugin.ts`

**Purpose**: Generate proto plugin JSON configurations from GitHub repository
URLs.

**Features**:

- Auto-detection of release assets and patterns
- Interactive mode for manual configuration
- Support for complex binary structures
- Architecture mapping (x86_64, aarch64, etc.)
- Cross-platform support (Linux, macOS, Windows)

**Usage**:

```bash
# Auto-generate from GitHub URL
npm run generate-auto -- https://github.com/owner/repo

# Interactive mode
npm run generate-interactive

# Direct script execution
node --experimental-strip-types ./scripts/generate-proto-plugin.ts --auto https://github.com/owner/repo
```

#### `generate-proto-plugin-stricli.ts`

**Purpose**: Generate proto plugin JSON configurations using the Stricli CLI framework.

**Features**:

- Same functionality as `generate-proto-plugin.ts`
- Built with Stricli for type-safe CLI development
- Enhanced argument parsing and validation
- Better error handling and user experience
- Cross-runtime compatibility (Node.js, Bun, Deno)
- Runtime-specific help examples

**Usage**:

```bash
# Auto-generate from GitHub URL
npm run generate-stricli-auto -- https://github.com/owner/repo

# Interactive mode
npm run generate-stricli -- https://github.com/owner/repo

# Cross-runtime execution
npm run generate-stricli:node -- --auto https://github.com/owner/repo
npm run generate-stricli:bun -- --auto https://github.com/owner/repo
npm run generate-stricli:deno -- --auto https://github.com/owner/repo

# Direct script execution
node --experimental-strip-types ./scripts/generate-proto-plugin-stricli.ts --auto https://github.com/owner/repo
```

### Testing Scripts

#### `test-proto-plugin-with-proto.ts`

**Purpose**: Test proto plugin configurations using the proto tool manager
itself.

**Features**:

- Uses proto for installation and testing
- Realistic testing environment
- Automatic tool management
- Version pinning support
- Integration testing
- Permission handling for executables

**Usage**:

```bash
# Test plugin with proto
npm run test-plugin -- plugins/d2.json

# Test with specific version
npm run test-plugin -- --version 0.7.0 plugins/d2.json

# Test with verbose output
npm run test-plugin -- --verbose plugins/d2.json
```

### Workflow Testing Scripts

#### `test-workflows-with-act.ts`

**Purpose**: Test GitHub Actions workflows locally using the act CLI.

**Features**:

- Local workflow testing with act
- Support for proto-installed act CLI
- Trunk validation integration
- Multiple event types (push, pull_request, workflow_dispatch)
- Dry-run mode
- Custom platform selection

**Usage**:

```bash
# Test main workflow
npm run test-workflows

# Test specific workflow
npm run test-workflows test-single-plugin.yml

# Dry run mode
npm run test-workflows -- --dry-run

# Test specific job
npm run test-workflows -- --job detect-plugins
```

#### `setup-act-testing.sh`

**Purpose**: Setup script for local GitHub Actions testing with act CLI.

**Features**:

- Automatic act installation (via proto or system package manager)
- Docker image management
- Configuration file creation
- Environment setup
- Test validation

**Usage**:

```bash
# Setup act testing environment
npm run setup-act

# Or run directly
./scripts/setup-act-testing.sh
```

## Workflow Validation

### Trunk Integration

All workflow files are validated using Trunk.io CLI:

```bash
# Validate workflow files
npm run validate-workflows

# Format workflow files
npm run format-workflows

# Lint all files
npm run lint-all
```

## Development Workflow

### 1. Generate New Plugins

```bash
npm run generate-auto -- https://github.com/owner/repo
```

### 2. Test the Plugin

```bash
npm run test-plugin -- plugins/tool.json
```

### 3. Test Workflows Locally

```bash
# Setup act (one-time)
npm run setup-act

# Test workflows
npm run test-workflows
```

### 4. Validate Before Commit

```bash
npm run validate-workflows
npm run lint-all
```

## Requirements

- **Node.js**: 22.6.0 or later (for `--experimental-strip-types`)
- **Proto**: Latest version for plugin testing
- **Trunk**: For workflow validation and linting
- **Docker**: For act CLI testing (optional)
- **Stricli**: Type-safe CLI framework (installed as dev dependency)
- **Internet access**: For downloading tools and GitHub API access

## File Structure

```
scripts/
├── README.md                           # This file
├── generate-proto-plugin.ts            # Core plugin generator
├── generate-proto-plugin-stricli.ts    # Stricli-based plugin generator
├── test-proto-plugin-with-proto.ts     # Plugin testing with proto
├── test-workflows-with-act.ts          # Local workflow testing
├── setup-act-testing.sh               # Act CLI setup script
├── shared-utils.ts                     # Shared utilities and functions
└── types.ts                           # TypeScript type definitions
```

## TypeScript Support

These scripts use Node.js's experimental `--experimental-strip-types` feature:

- ✅ Full TypeScript syntax support
- ✅ Type checking at runtime
- ✅ No build step required
- ✅ No external TypeScript dependencies
- ⚠️ Requires Node.js 22.6.0 or later
- ⚠️ Experimental feature (may change in future Node.js versions)
