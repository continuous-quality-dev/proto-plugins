# Plugin Generation Rules

This document defines the rules and patterns for generating proto plugins from GitHub repositories in the proto-plugins project.

## 🎯 Core Plugin Generation Principles

### 1. **Automated Detection**
- Automatically detect plugin type from repository content
- Infer platform support from release assets
- Extract version information from GitHub releases
- Generate meaningful plugin names from repository metadata

### 2. **Validation First**
- Validate GitHub repository accessibility
- Verify release asset availability
- Check for required metadata fields
- Ensure generated plugin meets proto schema requirements

### 3. **Cross-Platform Support**
- Generate plugins for all supported platforms when possible
- Handle platform-specific asset naming patterns
- Support multiple architecture variants (x64, arm64, etc.)
- Gracefully handle missing platform support

## 📋 Plugin Generation Workflow

### 1. **Repository Analysis**

```typescript
// ✅ GOOD: Comprehensive repository analysis
export interface RepositoryAnalysis {
  owner: string;
  name: string;
  description: string;
  homepage: string;
  language: string;
  topics: string[];
  hasReleases: boolean;
  latestRelease: GitHubRelease | null;
  releaseAssets: GitHubAsset[];
  detectedType: ProtoPluginType;
  supportedPlatforms: Platform[];
}

export async function analyzeRepository(
  owner: string,
  repo: string
): Promise<RepositoryAnalysis> {
  // 1. Fetch repository metadata
  const repository = await fetchGitHubRepository(owner, repo);
  
  // 2. Fetch latest release
  const latestRelease = await fetchLatestRelease(owner, repo);
  
  // 3. Analyze release assets
  const assets = latestRelease?.assets || [];
  const supportedPlatforms = detectSupportedPlatforms(assets);
  
  // 4. Detect plugin type
  const detectedType = detectPluginType(repository, assets);
  
  return {
    owner,
    name: repo,
    description: repository.description || '',
    homepage: repository.homepage || '',
    language: repository.language || '',
    topics: repository.topics || [],
    hasReleases: !!latestRelease,
    latestRelease,
    releaseAssets: assets,
    detectedType,
    supportedPlatforms,
  };
}
```

### 2. **Asset Pattern Detection**

```typescript
// ✅ GOOD: Platform and architecture detection patterns
export const PLATFORM_PATTERNS = {
  linux: [
    /linux/i,
    /ubuntu/i,
    /debian/i,
    /-linux-/i,
    /\.linux\./i,
  ],
  macos: [
    /macos/i,
    /darwin/i,
    /osx/i,
    /mac/i,
    /-macos-/i,
    /-darwin-/i,
    /\.macos\./i,
  ],
  windows: [
    /windows/i,
    /win32/i,
    /win64/i,
    /\.exe$/i,
    /-windows-/i,
    /-win-/i,
  ],
} as const;

export const ARCHITECTURE_PATTERNS = {
  x64: [
    /x64/i,
    /x86_64/i,
    /amd64/i,
    /-x64-/i,
    /-amd64-/i,
  ],
  arm64: [
    /arm64/i,
    /aarch64/i,
    /-arm64-/i,
    /-aarch64-/i,
  ],
  x86: [
    /x86/i,
    /i386/i,
    /386/i,
    /-x86-/i,
    /-i386-/i,
  ],
} as const;

export function detectPlatformFromAsset(assetName: string): Platform | null {
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(assetName))) {
      return platform as Platform;
    }
  }
  return null;
}

export function detectArchitectureFromAsset(assetName: string): Architecture | null {
  for (const [arch, patterns] of Object.entries(ARCHITECTURE_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(assetName))) {
      return arch as Architecture;
    }
  }
  return null;
}
```

### 3. **Plugin Type Detection**

```typescript
// ✅ GOOD: Plugin type detection based on repository characteristics
export function detectPluginType(
  repository: GitHubRepository,
  assets: GitHubAsset[]
): ProtoPluginType {
  const { name, description, language, topics } = repository;
  const assetNames = assets.map(asset => asset.name.toLowerCase());
  
  // Check for language tools (compilers, interpreters)
  const languageIndicators = [
    'compiler', 'interpreter', 'runtime', 'sdk',
    'go', 'rust', 'python', 'node', 'java', 'kotlin'
  ];
  
  if (
    languageIndicators.some(indicator => 
      name.toLowerCase().includes(indicator) ||
      description.toLowerCase().includes(indicator) ||
      topics.some(topic => topic.toLowerCase().includes(indicator))
    )
  ) {
    return 'language';
  }
  
  // Check for development tools
  const toolIndicators = [
    'cli', 'tool', 'utility', 'formatter', 'linter',
    'analyzer', 'generator', 'builder', 'bundler'
  ];
  
  if (
    toolIndicators.some(indicator =>
      name.toLowerCase().includes(indicator) ||
      description.toLowerCase().includes(indicator)
    )
  ) {
    return 'tool';
  }
  
  // Default to binary if executable assets are found
  const hasExecutables = assetNames.some(name =>
    name.endsWith('.exe') ||
    name.includes('linux') ||
    name.includes('darwin') ||
    name.includes('macos')
  );
  
  return hasExecutables ? 'binary' : 'tool';
}
```

## 🔧 Plugin Configuration Generation

### 1. **Install Configuration**

```typescript
// ✅ GOOD: Platform-specific install configuration
export function generateInstallConfig(
  analysis: RepositoryAnalysis
): Record<Platform, InstallConfig> {
  const installConfigs: Record<Platform, InstallConfig> = {};
  
  for (const platform of analysis.supportedPlatforms) {
    const platformAssets = analysis.releaseAssets.filter(asset =>
      detectPlatformFromAsset(asset.name) === platform
    );
    
    if (platformAssets.length === 0) continue;
    
    // Prefer specific architecture, fallback to universal
    const preferredAsset = selectPreferredAsset(platformAssets, platform);
    
    installConfigs[platform] = {
      download: preferredAsset.browser_download_url,
      checksum: generateChecksumUrl(preferredAsset),
      ...(needsExtraction(preferredAsset) && {
        extract: generateExtractionConfig(preferredAsset)
      }),
    };
  }
  
  return installConfigs;
}

function selectPreferredAsset(
  assets: GitHubAsset[],
  platform: Platform
): GitHubAsset {
  // Prefer x64 architecture for compatibility
  const x64Asset = assets.find(asset =>
    detectArchitectureFromAsset(asset.name) === 'x64'
  );
  
  if (x64Asset) return x64Asset;
  
  // Fallback to first available asset
  return assets[0];
}

function needsExtraction(asset: GitHubAsset): boolean {
  const name = asset.name.toLowerCase();
  return (
    name.endsWith('.tar.gz') ||
    name.endsWith('.zip') ||
    name.endsWith('.tar.xz') ||
    name.endsWith('.7z')
  );
}
```

### 2. **Resolve Configuration**

```typescript
// ✅ GOOD: Binary resolution configuration
export function generateResolveConfig(
  analysis: RepositoryAnalysis
): ResolveConfig {
  const { name, detectedType } = analysis;
  
  // Generate binary name based on repository name and type
  const binaryName = generateBinaryName(name, detectedType);
  
  return {
    binary: binaryName,
    ...(detectedType === 'language' && {
      env: generateEnvironmentConfig(analysis)
    }),
  };
}

function generateBinaryName(repoName: string, type: ProtoPluginType): string {
  // Remove common prefixes/suffixes
  let binaryName = repoName
    .replace(/^(go-|rust-|js-|ts-)/, '')
    .replace(/(-cli|-tool|-bin)$/, '');
  
  // Handle special cases
  const specialCases: Record<string, string> = {
    'typescript': 'tsc',
    'golang': 'go',
    'nodejs': 'node',
    'python': 'python',
  };
  
  return specialCases[binaryName.toLowerCase()] || binaryName;
}

function generateEnvironmentConfig(
  analysis: RepositoryAnalysis
): Record<string, string> {
  const env: Record<string, string> = {};
  
  // Add common environment variables for language tools
  if (analysis.language === 'Go') {
    env.GOROOT = '${PROTO_INSTALL_DIR}';
    env.GOPATH = '${HOME}/go';
  }
  
  if (analysis.language === 'Rust') {
    env.CARGO_HOME = '${PROTO_INSTALL_DIR}';
    env.RUSTUP_HOME = '${PROTO_INSTALL_DIR}';
  }
  
  return env;
}
```

### 3. **Plugin Metadata Generation**

```typescript
// ✅ GOOD: Complete plugin metadata generation
export function generateProtoPlugin(
  analysis: RepositoryAnalysis,
  options: GenerationOptions = {}
): ProtoPlugin {
  const {
    owner,
    name,
    description,
    homepage,
    latestRelease,
    detectedType,
  } = analysis;
  
  const pluginName = options.pluginName || generatePluginName(name);
  const version = latestRelease?.tag_name.replace(/^v/, '') || '0.0.0';
  
  return {
    name: pluginName,
    type: detectedType,
    description: description || `${name} tool`,
    homepage: homepage || `https://github.com/${owner}/${name}`,
    repository: `https://github.com/${owner}/${name}`,
    version,
    platform: generateInstallConfig(analysis),
    resolve: generateResolveConfig(analysis),
    ...(options.includeMetadata && {
      metadata: {
        generatedAt: new Date().toISOString(),
        sourceRepository: `${owner}/${name}`,
        detectedType,
        originalRelease: latestRelease?.tag_name,
      }
    }),
  };
}

function generatePluginName(repoName: string): string {
  // Convert repository name to plugin name
  return repoName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
```

## ✅ Validation Rules

### 1. **Pre-Generation Validation**

```typescript
// ✅ GOOD: Comprehensive pre-generation validation
export async function validateRepositoryForGeneration(
  owner: string,
  repo: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // 1. Check repository accessibility
    const repository = await fetchGitHubRepository(owner, repo);
    
    if (repository.archived) {
      warnings.push('Repository is archived');
    }
    
    if (repository.private) {
      errors.push('Repository is private and cannot be accessed');
    }
    
    // 2. Check for releases
    const releases = await fetchGitHubReleases(owner, repo);
    
    if (releases.length === 0) {
      errors.push('Repository has no releases');
      return { isValid: false, errors, warnings };
    }
    
    // 3. Check latest release has assets
    const latestRelease = releases[0];
    
    if (latestRelease.assets.length === 0) {
      errors.push('Latest release has no downloadable assets');
    }
    
    // 4. Check for supported platforms
    const supportedPlatforms = detectSupportedPlatforms(latestRelease.assets);
    
    if (supportedPlatforms.length === 0) {
      warnings.push('No supported platforms detected from release assets');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
    
  } catch (error) {
    errors.push(`Failed to validate repository: ${error.message}`);
    return { isValid: false, errors, warnings };
  }
}
```

### 2. **Post-Generation Validation**

```typescript
// ✅ GOOD: Generated plugin validation
export function validateGeneratedPlugin(plugin: ProtoPlugin): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields validation
  const requiredFields = ['name', 'type', 'platform', 'resolve'];
  
  for (const field of requiredFields) {
    if (!(field in plugin) || plugin[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Name validation
  if (plugin.name && !/^[a-z0-9-]+$/.test(plugin.name)) {
    errors.push('Plugin name must contain only lowercase letters, numbers, and hyphens');
  }
  
  // Platform validation
  if (plugin.platform && Object.keys(plugin.platform).length === 0) {
    errors.push('Plugin must support at least one platform');
  }
  
  // Version validation
  if (plugin.version && !/^\d+\.\d+\.\d+/.test(plugin.version)) {
    warnings.push('Version does not follow semantic versioning');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
```

## 🚨 Common Anti-Patterns

### 1. **Hardcoded Asset Selection**

```typescript
// ❌ BAD: Hardcoded asset selection
function selectAsset(assets: GitHubAsset[]): GitHubAsset {
  return assets.find(asset => asset.name.includes('linux-x64')) || assets[0];
}

// ✅ GOOD: Pattern-based asset selection
function selectAsset(assets: GitHubAsset[], platform: Platform): GitHubAsset | null {
  const platformAssets = assets.filter(asset =>
    detectPlatformFromAsset(asset.name) === platform
  );
  
  return selectPreferredAsset(platformAssets, platform);
}
```

### 2. **Missing Error Handling**

```typescript
// ❌ BAD: No error handling
async function generatePlugin(owner: string, repo: string): Promise<ProtoPlugin> {
  const repository = await fetchGitHubRepository(owner, repo);
  const release = await fetchLatestRelease(owner, repo);
  return generateProtoPlugin(repository, release);
}

// ✅ GOOD: Comprehensive error handling
async function generatePlugin(owner: string, repo: string): Promise<ProtoPlugin> {
  try {
    const validation = await validateRepositoryForGeneration(owner, repo);
    
    if (!validation.isValid) {
      throw new ValidationError(
        'Repository validation failed',
        { errors: validation.errors }
      );
    }
    
    const analysis = await analyzeRepository(owner, repo);
    const plugin = generateProtoPlugin(analysis);
    
    const pluginValidation = validateGeneratedPlugin(plugin);
    
    if (!pluginValidation.isValid) {
      throw new ValidationError(
        'Generated plugin validation failed',
        { errors: pluginValidation.errors }
      );
    }
    
    return plugin;
    
  } catch (error) {
    if (error instanceof ValidationError || error instanceof GitHubError) {
      throw error;
    }
    
    throw new ProtoPluginError(
      'Failed to generate plugin',
      'GENERATION_ERROR',
      { owner, repo, error }
    );
  }
}
```

## 📋 Plugin Generation Checklist

For every generated plugin:

- [ ] **Repository Validation**: Repository is accessible and has releases
- [ ] **Asset Detection**: Release assets are properly analyzed
- [ ] **Platform Support**: All supported platforms are detected
- [ ] **Type Detection**: Plugin type is correctly identified
- [ ] **Install Config**: Download URLs and extraction are configured
- [ ] **Resolve Config**: Binary resolution is properly set up
- [ ] **Metadata**: All required fields are populated
- [ ] **Validation**: Generated plugin passes schema validation
- [ ] **Testing**: Plugin can be installed and tested with proto
- [ ] **Documentation**: Generation process is logged and traceable

---

*These rules ensure consistent, reliable, and high-quality plugin generation from GitHub repositories.*
