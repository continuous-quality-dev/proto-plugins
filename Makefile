# Proto Plugins Makefile
# Provides convenient shortcuts for common development tasks

.PHONY: help install test lint format clean build dev docs

# Default target
help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Installation and setup
install: ## Install dependencies
	npm install

setup: install ## Setup development environment
	npm run setup-act

# Development
dev: ## Start development mode
	npm run generate:interactive

generate: ## Generate plugin (interactive mode)
	npm run generate

generate-auto: ## Generate plugin (auto mode)
	npm run generate:auto

# Testing
test: ## Run all tests
	npm test

test-unit: ## Run unit tests only
	npm run test:property

test-integration: ## Run integration tests
	npm run plugin:test

test-workflows: ## Test GitHub workflows with act
	npm run test:workflows

# Code quality
lint: ## Run linter
	npm run lint-all

format: ## Format code
	npm run format-workflows

validate: ## Validate workflows
	npm run validate-workflows

# Analysis and documentation
complexity: ## Generate complexity analysis
	npm run generate-complexity-comparison

diagrams: ## Generate diagrams
	npm run generate-diagrams-changed

docs: ## Generate documentation
	npm run complexity && npm run diagrams

# Plugin management
plugin-select: ## Interactive plugin selection
	npm run plugin:select

plugin-install: ## Install all local plugins
	npm run plugin:install-local

# Cleanup
clean: ## Clean generated files
	rm -rf node_modules/.cache
	rm -rf .trunk/out
	rm -f complexity-*.json
	rm -f test-summary-*.md

# Build and release
build: test lint ## Build and validate everything
	@echo "✅ Build completed successfully"

# Cross-runtime testing
test-node: ## Test with Node.js
	npm run test:node

test-bun: ## Test with Bun
	npm run test:bun

test-deno: ## Test with Deno
	npm run test:deno

# Danger.js
danger: ## Run Danger.js checks
	npm run danger:local

# Quick development workflow
quick: lint test ## Quick development check (lint + test)

# Full CI workflow
ci: install lint test build ## Full CI workflow

# Development server (if applicable)
serve: ## Serve documentation or development server
	@echo "No development server configured"

# Version management
version: ## Show current version
	@node -p "require('./package.json').version"

# Environment info
env: ## Show environment information
	@echo "Node.js version: $$(node --version)"
	@echo "npm version: $$(npm --version)"
	@echo "Proto version: $$(proto --version 2>/dev/null || echo 'Not installed')"
	@echo "Operating System: $$(uname -s)"
	@echo "Architecture: $$(uname -m)"
