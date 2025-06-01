#!/bin/bash

# Setup script for testing GitHub workflows locally with act
# This script installs act, configures Docker, and sets up the testing environment

set -e

echo "🧪 Setting up Act CLI for GitHub Workflows Testing"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
	echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
	echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
	echo -e "${RED}❌ $1${NC}"
}

print_info() {
	echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running on supported OS
check_os() {
	if [[ ${OSTYPE} == "linux-gnu"* ]]; then
		OS="linux"
	elif [[ ${OSTYPE} == "darwin"* ]]; then
		OS="macos"
	elif [[ ${OSTYPE} == "msys" ]] || [[ ${OSTYPE} == "cygwin" ]]; then
		OS="windows"
	else
		print_error "Unsupported operating system: ${OSTYPE}"
		exit 1
	fi
	print_info "Detected OS: ${OS}"
}

# Check if Docker is installed and running
check_docker() {
	print_info "Checking Docker installation..."

	if ! command -v docker &>/dev/null; then
		print_error "Docker is not installed. Please install Docker first:"
		echo "  🍎 macOS: https://docs.docker.com/desktop/mac/install/"
		echo "  🐧 Linux: https://docs.docker.com/engine/install/"
		echo "  🪟 Windows: https://docs.docker.com/desktop/windows/install/"
		exit 1
	fi

	if ! docker info &>/dev/null; then
		print_error "Docker is not running. Please start Docker and try again."
		exit 1
	fi

	print_status "Docker is installed and running"
}

# Install act CLI
install_act() {
	print_info "Checking act CLI installation..."

	# Check if act is available directly
	if command -v act &>/dev/null; then
		print_status "Act CLI is already installed: $(act --version)"
		return
	fi

	# Check if proto is available and try to install act with it
	if command -v proto &>/dev/null; then
		print_info "Proto is available. Installing act CLI with proto..."
		if proto install act; then
			print_status "Act CLI installed successfully with proto"
			return
		else
			print_warning "Failed to install act with proto, trying alternative methods..."
		fi
	else
		print_warning "Proto not found. Using alternative installation methods..."
	fi

	print_info "Installing act CLI with system package manager..."

	case ${OS} in
	"macos")
		if command -v brew &>/dev/null; then
			brew install act
		else
			print_error "Homebrew not found. Please install Homebrew first or install act manually."
			exit 1
		fi
		;;
	"linux")
		curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
		;;
	"windows")
		print_error "Please install act manually on Windows:"
		echo "  proto install act  # Recommended if proto is available"
		echo "  choco install act-cli"
		echo "  # or"
		echo "  scoop install act"
		exit 1
		;;
	esac

	print_status "Act CLI installed successfully"
}

# Pull required Docker images
pull_docker_images() {
	print_info "Pulling required Docker images for act..."

	images=(
		"catthehacker/ubuntu:act-latest"
		"catthehacker/ubuntu:act-22.04"
		"catthehacker/ubuntu:act-20.04"
	)

	for image in "${images[@]}"; do
		print_info "Pulling ${image}..."
		if docker pull "${image}"; then
			print_status "Successfully pulled ${image}"
		else
			print_warning "Failed to pull ${image} (will be downloaded when needed)"
		fi
	done
}

# Create act configuration files
create_act_config() {
	print_info "Creating act configuration files..."

	# Create .actrc file
	cat >.actrc <<'EOF'
# Act configuration for proto-plugins testing
--platform ubuntu-latest=catthehacker/ubuntu:act-latest
--platform ubuntu-22.04=catthehacker/ubuntu:act-22.04
--platform ubuntu-20.04=catthehacker/ubuntu:act-20.04
--platform macos-latest=catthehacker/ubuntu:act-latest
--platform macos-12=catthehacker/ubuntu:act-latest
--platform windows-latest=catthehacker/ubuntu:act-latest
--platform windows-2022=catthehacker/ubuntu:act-latest
--container-architecture linux/amd64
--artifact-server-path /tmp/artifacts
--env NODE_VERSION=22.6.0
--env CI=true
EOF

	print_status "Created .actrc configuration file"

	# Create .act-secrets file
	cat >.act-secrets <<'EOF'
GITHUB_TOKEN=ghp_fake_token_for_local_testing
NODE_VERSION=22.6.0
EOF

	print_status "Created .act-secrets file"

	# Create .gitignore entries for act files
	if [[ -f .gitignore ]]; then
		if ! grep -q ".act-secrets" .gitignore; then
			echo "" >>.gitignore
			echo "# Act CLI testing files" >>.gitignore
			echo ".act-secrets" >>.gitignore
			echo ".act-event.json" >>.gitignore
			print_status "Added act files to .gitignore"
		fi
	fi
}

# Test act installation
test_act() {
	print_info "Testing act installation..."

	# Determine which act command to use
	ACT_CMD="act"
	if ! command -v act &>/dev/null; then
		if command -v proto &>/dev/null; then
			ACT_CMD="proto run act --"
			print_info "Using act via proto"
		else
			print_error "Act command not found"
			return 1
		fi
	fi

	# Create a simple test event
	cat >.act-test-event.json <<'EOF'
{
  "inputs": {
    "plugin_pattern": "d2-auto.json"
  }
}
EOF

	print_info "Running act dry-run test..."

	if ${ACT_CMD} workflow_dispatch \
		--workflows .github/workflows/test-plugins.yml \
		--eventpath .act-test-event.json \
		--secret-file .act-secrets \
		--dryrun \
		--job detect-plugins; then
		print_status "Act dry-run test passed!"
	else
		print_warning "Act dry-run test failed, but act is installed correctly"
	fi

	# Cleanup test files
	rm -f .act-test-event.json
}

# Show usage examples
show_usage() {
	echo ""
	echo "🎯 Act CLI Setup Complete!"
	echo "========================="
	echo ""
	echo "You can now test GitHub workflows locally using these commands:"
	echo ""
	echo "📋 Basic Usage:"
	echo "  npm run test-workflows                           # Test main workflow"
	echo "  npm run test-workflows test-single-plugin.yml   # Test specific workflow"
	echo "  npm run test-workflows -- --dry-run             # Dry run mode"
	echo "  npm run test-workflows -- --verbose             # Verbose output"
	echo ""
	echo "🎯 Advanced Usage:"
	echo "  npm run test-workflows -- --job detect-plugins  # Test specific job"
	echo "  npm run test-workflows -- --event push          # Test push event"
	echo "  npm run test-workflows -- --platform macos-latest # Test on macOS"
	echo ""
	echo "🔧 Direct act commands:"
	echo "  act workflow_dispatch --workflows .github/workflows/test-plugins.yml --dryrun"
	echo "  act push --workflows .github/workflows/test-plugins.yml --job detect-plugins"
	echo ""
	echo "� With proto (if act installed via proto):"
	echo "  proto run act -- workflow_dispatch --workflows .github/workflows/test-plugins.yml --dryrun"
	echo "  proto run act -- push --workflows .github/workflows/test-plugins.yml --job detect-plugins"
	echo ""
	echo "�📚 More info:"
	echo "  act --help"
	echo "  https://github.com/nektos/act"
	echo ""
	echo "⚠️  Note: Local testing has limitations compared to GitHub Actions:"
	echo "  - Some actions may not work exactly the same"
	echo "  - Network access may be limited"
	echo "  - Some GitHub-specific features are mocked"
	echo ""
}

# Main execution
main() {
	check_os
	check_docker
	install_act
	pull_docker_images
	create_act_config
	test_act
	show_usage

	print_status "Setup complete! You can now test workflows locally with act."
}

# Run main function
main "$@"
