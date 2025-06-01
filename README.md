# Proto Plugins

[![Test Proto Plugins](https://github.com/continuous-quality-dev/proto-plugins/actions/workflows/test-plugins.yml/badge.svg)](https://github.com/continuous-quality-dev/proto-plugins/actions/workflows/test-plugins.yml)

A collection of proto plugin configurations and tools for managing development tools across multiple platforms.

## 🚀 Quick Start

### Using Plugins

All plugins are automatically tested across Linux, macOS, and Windows. To use a plugin:

1. **Copy the plugin file** to your proto plugins directory:

   ```bash
   cp plugins/d2-auto.json ~/.proto/plugins/d2.json
   ```

2. **Install the tool**:

   ```bash
   proto install d2
   ```

3. **Use the tool**:
   ```bash
   proto run d2 --version
   ```

### Interactive Plugin Selection

For an interactive version of `proto plugin ...`:

```sh
deno run --allow-all .\proto-plugin-selection.ts
```

## 📦 Available Plugins

All plugins use JSON format and are automatically generated from GitHub releases:

| Tool           | Description                    | Status    |
| -------------- | ------------------------------ | --------- |
| **d2**         | Diagram scripting language     | ✅ Tested |
| **dnscontrol** | DNS configuration management   | ✅ Tested |
| **grit**       | Code search and transformation | ✅ Tested |
| **hurl**       | HTTP testing tool              | ✅ Tested |
| **just**       | Command runner                 | ✅ Tested |
| **k6**         | Load testing tool              | ✅ Tested |
| **nrr**        | Node.js script runner          | ✅ Tested |
| **tyson**      | JSON processor                 | ✅ Tested |
| **vale**       | Prose linter                   | ✅ Tested |
| **nitric**     | Cloud backend framework        | ✅ Tested |
| **difft**      | Structural diff tool           | ✅ Tested |
| **task**       | Task runner                    | ✅ Tested |

## 🛠️ Development Tools

### Generate New Plugins

```bash
# Generate from GitHub URL
npm run generate-auto -- https://github.com/owner/repo

# Interactive generation
npm run generate-interactive
```

### Test Plugins

```bash
# Test a specific plugin
npm run test-plugin-with-proto -- plugins/d2.json

# Test with specific version
npm run test-plugin-with-proto -- --version 0.7.0 plugins/d2.json

# Batch test all plugins
npm run batch-test
```

### Convert TOML to JSON

```bash
# Convert all TOML files to JSON
npm run batch-convert

# Test and cleanup TOML files
npm run test-and-cleanup
```

## 🧪 Automated Testing

This repository includes comprehensive GitHub Actions workflows:

- **🔄 Continuous Testing**: All plugins tested on push/PR
- **📅 Weekly Testing**: Catches version updates and breaking changes
- **🎯 Manual Testing**: Test specific plugins or patterns
- **🌍 Cross-Platform**: Linux, macOS, and Windows support

See [Workflow Documentation](.github/workflows/README.md) for details.

## 📋 Requirements

- **Node.js**: 22.6.0 or later
- **Proto**: Latest version
- **npm**: For running scripts

## 🤝 Contributing

1. **Add new plugins** using the generator scripts
2. **Test locally** before submitting
3. **Update documentation** as needed
4. **Submit PR** - automated testing will validate changes

## 📚 Documentation

- [Workflow Documentation](.github/workflows/README.md)
- [Proto Documentation](https://moonrepo.dev/docs/proto)
- [Plugin Schema](https://moonrepo.dev/docs/proto/plugins)
