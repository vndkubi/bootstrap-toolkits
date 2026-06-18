#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEFAULT_OUT_DIR = path.join('docs', 'ai');

const FILESYSTEM_SKIP_DIRS = new Set([
  '.artifacts',
  '.git',
  '.gradle',
  '.idea',
  '.memory',
  'bin',
  'build',
  'coverage',
  'DerivedData',
  'dist',
  'node_modules',
  'obj',
  'out',
  'Pods',
  'results',
  'target',
  'vendor'
]);

const BOOTSTRAP_BUNDLE_PREFIXES = [
  '.github/agents/',
  '.github/docs/',
  '.github/hooks/',
  '.github/instructions/',
  '.github/prompts/',
  '.github/schemas/',
  '.github/scripts/',
  '.github/skills/',
  '.github/templates/'
];

const BOOTSTRAP_BUNDLE_FILES = new Set([
  '.github/.bootstrap-manifest.json',
  '.github/.bootstrap-snapshot.json',
  '.github/.bootstrap-state.json',
  '.github/.bootstrap-summary.md',
  '.github/.context-packets.json',
  '.github/.phase3-checkpoint.md',
  '.github/.runtime-fidelity.json',
  '.github/.scan-report.md',
  '.github/.skill-index.json',
  '.github/.skill-lineage.json',
  '.github/MODULE-ARCHITECTURE.md',
  '.github/autorun.allowlist.example',
  '.github/autorun.config.example.json',
  '.github/autorun.config.json',
  '.github/constitution.md',
  '.github/copilot-instructions.md',
  '.github/module-dependency-map.json',
  '.github/README.md',
  '.github/VERSION'
]);

const EXCLUDE_PATTERNS = [
  /(^|\/)dist\//,
  /(^|\/)build\//,
  /(^|\/)out\//,
  /(^|\/)coverage\//,
  /(^|\/)target\//,
  /(^|\/)bin\//,
  /(^|\/)obj\//,
  /(^|\/)DerivedData\//,
  /(^|\/)Pods\//,
  /(^|\/)node_modules\//,
  /(^|\/)vendor\//,
  /(^|\/)generated\//,
  /(^|\/)snapshots?\//,
  /\.min\.js$/,
  /\.map$/,
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock|Podfile\.lock)$/
];

const IMPORTANT_PATTERNS = [
  /(^|\/)README\.md$/i,
  /(^|\/)AGENTS\.md$/,
  /(^|\/)CLAUDE\.md$/,
  /(^|\/)\.github\/copilot-instructions\.md$/,
  /(^|\/)\.github\/instructions\/.*\.md$/,
  /(^|\/)\.github\/workflows\/.*\.ya?ml$/,
  /(^|\/)pom\.xml$/,
  /(^|\/)build\.gradle(\.kts)?$/,
  /(^|\/)settings\.gradle(\.kts)?$/,
  /(^|\/)gradle\.properties$/,
  /(^|\/)WEB-INF\/web\.xml$/,
  /(^|\/)WEB-INF\/faces-config\.xml$/,
  /(^|\/)META-INF\/(beans|persistence|ejb-jar|application|ra)\.xml$/,
  /(^|\/)microprofile-config\.properties$/,
  /(^|\/)(jboss-web|jboss-deployment-structure|glassfish-web|weblogic|weblogic-application|tomee)\.xml$/,
  /(^|\/).*\.sln$/,
  /(^|\/).*\.csproj$/,
  /(^|\/)Directory\.Build\.(props|targets)$/,
  /(^|\/)global\.json$/,
  /(^|\/)NuGet\.config$/,
  /(^|\/)Package\.swift$/,
  /(^|\/)Podfile$/,
  /(^|\/).*\.xcodeproj\//,
  /(^|\/).*\.xcworkspace\//,
  /(^|\/)pubspec\.yaml$/,
  /(^|\/)package\.json$/,
  /(^|\/)pnpm-workspace\.yaml$/,
  /(^|\/)turbo\.json$/,
  /(^|\/)nx\.json$/,
  /(^|\/)go\.mod$/,
  /(^|\/)Cargo\.toml$/,
  /(^|\/)pyproject\.toml$/,
  /(^|\/)composer\.json$/,
  /(^|\/)Gemfile$/
];

const MARKER_RULES = [
  ['java-maven', /(^|\/)pom\.xml$/, dirname],
  ['jvm-gradle', /(^|\/)build\.gradle(\.kts)?$/, dirname],
  ['jvm-gradle', /(^|\/)settings\.gradle(\.kts)?$/, dirname],
  ['enterprise-java', /(^|\/)WEB-INF\/web\.xml$/, enterpriseJavaRoot],
  ['enterprise-java', /(^|\/)WEB-INF\/faces-config\.xml$/, enterpriseJavaRoot],
  ['enterprise-java', /(^|\/)META-INF\/(beans|persistence|ejb-jar|application|ra)\.xml$/, enterpriseJavaRoot],
  ['enterprise-java', /(^|\/)microprofile-config\.properties$/, dirname],
  ['enterprise-java', /(^|\/)(jboss-web|jboss-deployment-structure|glassfish-web|weblogic|weblogic-application|tomee)\.xml$/, dirname],
  ['android', /(^|\/)AndroidManifest\.xml$/, androidRoot],
  ['android', /(^|\/)app\/build\.gradle(\.kts)?$/, () => '.'],
  ['dotnet', /(^|\/).*\.sln$/, dirname],
  ['dotnet', /(^|\/).*\.csproj$/, dirname],
  ['dotnet', /(^|\/)Directory\.Build\.(props|targets)$/, dirname],
  ['swift-package', /(^|\/)Package\.swift$/, dirname],
  ['ios-xcode', /(^|\/).*\.xcodeproj\//, (filePath) => rootBeforeBundle(filePath, '.xcodeproj')],
  ['ios-xcode', /(^|\/).*\.xcworkspace\//, (filePath) => rootBeforeBundle(filePath, '.xcworkspace')],
  ['ios-xcode', /(^|\/)Podfile$/, dirname],
  ['flutter', /(^|\/)pubspec\.yaml$/, dirname],
  ['web-node', /(^|\/)package\.json$/, dirname],
  ['react-native', /(^|\/)android\/app\/build\.gradle(\.kts)?$/, () => '.'],
  ['react-native', /(^|\/)ios\/.*\.xcodeproj\//, () => '.'],
  ['go', /(^|\/)go\.mod$/, dirname],
  ['rust', /(^|\/)Cargo\.toml$/, dirname],
  ['python', /(^|\/)pyproject\.toml$/, dirname],
  ['python', /(^|\/)requirements\.txt$/, dirname],
  ['php', /(^|\/)composer\.json$/, dirname],
  ['ruby', /(^|\/)Gemfile$/, dirname]
];

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function dirname(filePath) {
  const normalized = toPosixPath(filePath);
  const index = normalized.lastIndexOf('/');
  return index === -1 ? '.' : normalized.slice(0, index);
}

function androidRoot(filePath) {
  const normalized = toPosixPath(filePath);
  const srcIndex = normalized.indexOf('/src/main/AndroidManifest.xml');
  if (srcIndex > 0) {
    return normalized.slice(0, srcIndex);
  }
  return dirname(filePath);
}

function enterpriseJavaRoot(filePath) {
  const normalized = toPosixPath(filePath);
  for (const marker of ['/src/main/webapp/WEB-INF/', '/src/main/resources/META-INF/']) {
    const index = normalized.indexOf(marker);
    if (index > 0) {
      return normalized.slice(0, index);
    }
  }
  return dirname(filePath);
}

function rootBeforeBundle(filePath, bundleExtension) {
  const marker = `${bundleExtension}/`;
  const normalized = toPosixPath(filePath);
  const index = normalized.indexOf(marker);
  if (index === -1) {
    return dirname(filePath);
  }
  return dirname(normalized.slice(0, index + bundleExtension.length));
}

function hasFile(files, root, name) {
  return files.has(root === '.' ? name : `${root}/${name}`);
}

function fileMatches(filePath, patterns) {
  return patterns.some((pattern) => pattern.test(filePath));
}

function extensionOf(filePath) {
  const baseName = path.posix.basename(filePath);
  for (const suffix of ['.csproj', '.fsproj', '.vbproj', '.sln', '.gradle', '.kts']) {
    if (baseName.endsWith(suffix)) {
      return suffix;
    }
  }
  const extension = path.posix.extname(baseName);
  return extension || '[no-ext]';
}

function topLevelOf(filePath) {
  return filePath.split('/', 1)[0] || '.';
}

function increment(counter, key) {
  counter.set(key, (counter.get(key) || 0) + 1);
}

function sortedCounts(counter, limit) {
  return Array.from(counter.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

function classifyRepoSize(fileCount) {
  if (fileCount < 1000) return 'small';
  if (fileCount < 5000) return 'medium';
  if (fileCount < 20000) return 'large';
  return 'enterprise';
}

function indexingRisk(fileCount) {
  if (fileCount <= 2000) return 'normal';
  if (fileCount <= 2500) return 'near-local-indexing-limit';
  return 'above-local-indexing-limit';
}

function packageManager(root, files) {
  if (hasFile(files, root, 'pnpm-lock.yaml') || hasFile(files, '.', 'pnpm-workspace.yaml')) return 'pnpm';
  if (hasFile(files, root, 'yarn.lock')) return 'yarn';
  return 'npm';
}

function commandsFor(ecosystem, root, files) {
  const prefix = root === '.' ? '' : `cd ${root} && `;
  if (ecosystem === 'java-maven') {
    const runner = hasFile(files, root, 'mvnw') || hasFile(files, '.', 'mvnw') ? './mvnw' : 'mvn';
    return [`${prefix}${runner} test`];
  }
  if (ecosystem === 'enterprise-java') {
    return [];
  }
  if (ecosystem === 'jvm-gradle' || ecosystem === 'android') {
    const runner = hasFile(files, root, 'gradlew') || hasFile(files, '.', 'gradlew') ? './gradlew' : 'gradle';
    return ecosystem === 'android'
      ? [`${prefix}${runner} test`, `${prefix}${runner} lint`]
      : [`${prefix}${runner} test`, `${prefix}${runner} build`];
  }
  if (ecosystem === 'dotnet') return [`${prefix}dotnet build`, `${prefix}dotnet test`];
  if (ecosystem === 'swift-package') return [`${prefix}swift build`, `${prefix}swift test`];
  if (ecosystem === 'ios-xcode') return [`${prefix}xcodebuild -list`, `${prefix}xcodebuild test <scheme args>`];
  if (ecosystem === 'flutter') return [`${prefix}flutter analyze`, `${prefix}flutter test`];
  if (ecosystem === 'react-native') {
    const runner = packageManager(root, files);
    return [`${prefix}${runner} test`, `${prefix}${runner} run lint`];
  }
  if (ecosystem === 'web-node') {
    const runner = packageManager(root, files);
    return [`${prefix}${runner} test`, `${prefix}${runner} run lint`, `${prefix}${runner} run typecheck`];
  }
  if (ecosystem === 'go') return [`${prefix}go test ./...`];
  if (ecosystem === 'rust') return [`${prefix}cargo test`, `${prefix}cargo clippy`];
  if (ecosystem === 'python') return [`${prefix}pytest`, `${prefix}python -m pytest`];
  if (ecosystem === 'php') return [`${prefix}composer test`];
  if (ecosystem === 'ruby') return [`${prefix}bundle exec rake test`];
  return [];
}

function detectModules(files) {
  const fileSet = new Set(files);
  const modules = new Map();

  function ensureModule(root) {
    if (!modules.has(root)) {
      modules.set(root, {
        ecosystems: new Set(),
        markers: new Set(),
        commands: new Set()
      });
    }
    return modules.get(root);
  }

  for (const filePath of files) {
    for (const [ecosystem, pattern, rootFor] of MARKER_RULES) {
      if (!pattern.test(filePath)) continue;
      const root = rootFor(filePath) || '.';
      const moduleInfo = ensureModule(root);
      moduleInfo.ecosystems.add(ecosystem);
      moduleInfo.markers.add(filePath);
      for (const command of commandsFor(ecosystem, root, fileSet)) {
        moduleInfo.commands.add(command);
      }
    }
  }

  for (const [root, moduleInfo] of modules.entries()) {
    if (!moduleInfo.ecosystems.has('react-native')) continue;
    const hasPackageJson = hasFile(fileSet, root, 'package.json');
    const hasAndroid = files.some((filePath) => filePath === 'android/app/build.gradle' || filePath === 'android/app/build.gradle.kts' || filePath.includes('/android/app/build.gradle'));
    const hasIos = files.some((filePath) => filePath.startsWith('ios/') || filePath.includes('/ios/'));
    if (!hasPackageJson || !hasAndroid || !hasIos) {
      moduleInfo.ecosystems.delete('react-native');
    }
  }

  const result = {};
  for (const [root, moduleInfo] of Array.from(modules.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    result[root] = {
      ecosystems: Array.from(moduleInfo.ecosystems).sort(),
      markers: Array.from(moduleInfo.markers).sort().slice(0, 30),
      commands: Array.from(moduleInfo.commands).sort().slice(0, 20)
    };
  }
  return result;
}

function summarizeEcosystems(modules) {
  const counter = new Map();
  for (const moduleInfo of Object.values(modules)) {
    for (const ecosystem of moduleInfo.ecosystems) {
      increment(counter, ecosystem);
    }
  }
  return Object.fromEntries(sortedCounts(counter, 40));
}

function searchRecipes(activeEcosystems) {
  const ecosystems = new Set(activeEcosystems);
  const recipes = {};
  if (ecosystems.has('java-maven') || ecosystems.has('jvm-gradle')) {
    recipes['java-kotlin'] = [
      'rg -n "class |interface |enum |record |@SpringBootApplication|@Controller|@Service|@Repository|@(Path|ApplicationScoped|RequestScoped|Inject|Stateless|Stateful|Entity|NamedQuery|Provider|Transactional)" .',
      'rg -n "import (jakarta|javax)\\.(ws\\.rs|enterprise|inject|persistence|ejb|faces|servlet|validation|transaction|annotation|security)" .',
      'rg -n "TODO|FIXME|deprecated|@Deprecated" .',
      'rg -n "src/main|src/test|build.gradle|pom.xml" .'
    ];
  }
  if (ecosystems.has('enterprise-java')) {
    recipes['enterprise-java'] = [
      'rg -n "import (jakarta|javax)\\.(ws\\.rs|enterprise|inject|persistence|ejb|faces|servlet|validation|transaction|annotation|security)" .',
      'rg -n "@(Path|GET|POST|PUT|DELETE|ApplicationScoped|RequestScoped|SessionScoped|Inject|Produces|Consumes|Provider|Entity|Table|NamedQuery|Stateless|Stateful|Singleton|Transactional|RolesAllowed)" .',
      'git ls-files | rg "(WEB-INF/web\\.xml|WEB-INF/faces-config\\.xml|META-INF/(beans|persistence|ejb-jar|application|ra)\\.xml|microprofile-config\\.properties|jboss|glassfish|weblogic|tomee)"'
    ];
  }
  if (ecosystems.has('android')) {
    recipes.android = [
      'rg -n "Activity|Fragment|ViewModel|Composable|@HiltViewModel|AndroidManifest" .',
      'rg -n "navigation|NavHost|RoomDatabase|Retrofit|OkHttp" .'
    ];
  }
  if (ecosystems.has('dotnet')) {
    recipes.dotnet = [
      'rg -n "class |interface |record |Controller|DbContext|IHostedService|Program.cs|Startup.cs" .',
      'rg -n "appsettings|IOptions|ConfigureServices|MapGet|MapPost" .'
    ];
  }
  if (ecosystems.has('ios-xcode') || ecosystems.has('swift-package')) {
    recipes['ios-swift'] = [
      'rg -n "SwiftUI|UIViewController|ObservableObject|@main|AppDelegate|SceneDelegate" .',
      'rg -n "URLSession|Combine|async|await|CoreData|UserDefaults" .'
    ];
  }
  if (ecosystems.has('flutter')) {
    recipes.flutter = [
      'rg -n "Widget|StatelessWidget|StatefulWidget|ChangeNotifier|Bloc|Provider|Riverpod" .',
      'rg -n "MaterialApp|GoRouter|Navigator|pubspec.yaml" .'
    ];
  }
  if (ecosystems.has('react-native') || ecosystems.has('web-node')) {
    recipes['node-web-mobile'] = [
      'rg -n "export function|export const|React|useEffect|useMemo|useQuery|route|middleware" .',
      'rg -n "package.json|tsconfig|vite|next.config|metro.config" .'
    ];
  }
  return recipes;
}

function buildIndex(files, generatedAt = new Date().toISOString(), options = {}) {
  const topDirectories = new Map();
  const extensions = new Map();

  for (const filePath of files) {
    increment(topDirectories, topLevelOf(filePath));
    increment(extensions, extensionOf(filePath));
  }

  const modules = detectModules(files);
  const ecosystems = summarizeEcosystems(modules);
  const activeEcosystems = Object.keys(ecosystems).sort();

  return {
    schemaVersion: 1,
    generatedAt,
    source: options.source || 'git ls-files',
    sourceWarnings: options.sourceWarnings || [],
    repoSize: classifyRepoSize(files.length),
    indexingRisk: indexingRisk(files.length),
    totalFiles: files.length,
    ecosystems,
    topDirectories: sortedCounts(topDirectories, 40),
    topExtensions: sortedCounts(extensions, 40),
    modules,
    importantFiles: files.filter((filePath) => fileMatches(filePath, IMPORTANT_PATTERNS)).sort().slice(0, 200),
    exclusionCandidates: files.filter((filePath) => fileMatches(filePath, EXCLUDE_PATTERNS)).sort().slice(0, 300),
    searchRecipes: searchRecipes(activeEcosystems)
  };
}

function renderMarkdown(index) {
  const lines = [];
  const activeEcosystems = Object.keys(index.ecosystems);

  lines.push('# Repo Index');
  lines.push('');
  lines.push(`Generated deterministically from \`${index.source || 'git ls-files'}\`. No AI was used.`);
  if (Array.isArray(index.sourceWarnings) && index.sourceWarnings.length > 0) {
    for (const warning of index.sourceWarnings) {
      lines.push(`Warning: ${warning}`);
    }
  }
  lines.push('');
  lines.push('This is shared AI-agent context for GitHub Copilot, Copilot CLI, Codex, and other coding agents. Prefer this map over whole-repo scans.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Repo size: \`${index.repoSize}\``);
  lines.push(`- Tracked files: \`${index.totalFiles}\``);
  lines.push(`- Local indexing risk: \`${index.indexingRisk}\``);
  lines.push(`- Detected ecosystems: \`${activeEcosystems.length > 0 ? activeEcosystems.join(', ') : 'unknown'}\``);
  lines.push('');
  lines.push('## Token / Context Guidance');
  lines.push('');
  if (index.repoSize === 'large' || index.repoSize === 'enterprise') {
    lines.push('- Do not ask Copilot to inspect the whole repository.');
    lines.push('- Start with this index, then load only the relevant module docs or files.');
    lines.push('- First pass should read at most 5 files unless the user expands scope.');
  } else {
    lines.push('- Prefer selected files and focused diffs.');
  }
  if (index.indexingRisk !== 'normal') {
    lines.push('- `#codebase` may degrade on local indexing; prefer exact file references and targeted `rg` results.');
  }
  lines.push('- Avoid generated/build/vendor/lock files unless explicitly required.');
  lines.push('');

  lines.push('## Ecosystems');
  lines.push('');
  if (activeEcosystems.length > 0) {
    lines.push('| Ecosystem | Module count |');
    lines.push('|---|---:|');
    for (const [ecosystem, count] of Object.entries(index.ecosystems)) {
      lines.push(`| \`${ecosystem}\` | ${count} |`);
    }
  } else {
    lines.push('_No strong ecosystem markers detected._');
  }
  lines.push('');

  lines.push('## Module Candidates');
  lines.push('');
  lines.push('| Root | Ecosystems | Markers | Suggested commands |');
  lines.push('|---|---|---|---|');
  for (const [root, moduleInfo] of Object.entries(index.modules).slice(0, 120)) {
    const ecosystems = moduleInfo.ecosystems.map((item) => `\`${item}\``).join(', ');
    const markers = moduleInfo.markers.slice(0, 5).map((item) => `\`${item}\``).join('<br>');
    const commands = moduleInfo.commands.slice(0, 4).map((item) => `\`${item}\``).join('<br>');
    lines.push(`| \`${root}\` | ${ecosystems} | ${markers} | ${commands} |`);
  }
  lines.push('');

  lines.push('## Top Directories');
  lines.push('');
  lines.push('| Directory | Files |');
  lines.push('|---|---:|');
  for (const [directory, count] of index.topDirectories.slice(0, 30)) {
    lines.push(`| \`${directory}\` | ${count} |`);
  }
  lines.push('');

  lines.push('## Top Extensions');
  lines.push('');
  lines.push('| Extension | Files |');
  lines.push('|---|---:|');
  for (const [extension, count] of index.topExtensions.slice(0, 30)) {
    lines.push(`| \`${extension}\` | ${count} |`);
  }
  lines.push('');

  lines.push('## Important Files');
  lines.push('');
  for (const filePath of index.importantFiles.slice(0, 120)) {
    lines.push(`- \`${filePath}\``);
  }
  lines.push('');

  lines.push('## Exclusion Candidates');
  lines.push('');
  lines.push('These are likely low-signal for Copilot context unless the task explicitly requires them.');
  lines.push('');
  for (const filePath of index.exclusionCandidates.slice(0, 120)) {
    lines.push(`- \`${filePath}\``);
  }
  lines.push('');

  lines.push('## Search Recipes');
  lines.push('');
  for (const [name, commands] of Object.entries(index.searchRecipes)) {
    lines.push(`### ${name}`);
    lines.push('');
    for (const command of commands) {
      lines.push(`- \`${command}\``);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function gitLsFiles(rootDir) {
  const safeDirectory = toPosixPath(path.resolve(rootDir));
  const output = execFileSync('git', ['-c', `safe.directory=${safeDirectory}`, '-C', rootDir, 'ls-files', '-z'], {
    encoding: 'buffer',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  return output
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map(toPosixPath)
    .sort();
}

function hasCopiedBootstrapBundle(rootDir) {
  return fs.existsSync(path.join(rootDir, '.github', 'prompts', 'bootstrap-copilot.prompt.md'))
    && fs.existsSync(path.join(rootDir, '.github', 'skills', 'generate-copilot-config', 'SKILL.md'));
}

function isCopiedBootstrapBundleFile(filePath) {
  return BOOTSTRAP_BUNDLE_FILES.has(filePath)
    || BOOTSTRAP_BUNDLE_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

function walkFilesystemFiles(rootDir, currentDir = rootDir, files = []) {
  const excludeCopiedBundle = hasCopiedBootstrapBundle(rootDir);
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    if (entry.isDirectory() && FILESYSTEM_SKIP_DIRS.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      walkFilesystemFiles(rootDir, absolutePath, files);
      continue;
    }
    if (entry.isFile()) {
      const relativePath = toPosixPath(path.relative(rootDir, absolutePath));
      if (excludeCopiedBundle && isCopiedBootstrapBundleFile(relativePath)) {
        continue;
      }
      files.push(relativePath);
    }
  }
  return files.sort();
}

function collectRepoFiles(rootDir) {
  const warnings = [];
  try {
    const files = gitLsFiles(rootDir);
    if (files.length > 0) {
      return {
        files,
        source: 'git ls-files',
        sourceWarnings: warnings
      };
    }
    warnings.push('git ls-files returned no files; falling back to current filesystem files.');
  } catch (error) {
    warnings.push(`git ls-files failed: ${error.message}; falling back to current filesystem files.`);
  }

  return {
    files: walkFilesystemFiles(rootDir),
    source: 'filesystem walk',
    sourceWarnings: warnings
  };
}

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    outDir: DEFAULT_OUT_DIR,
    stdoutJson: false
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--root') {
      options.root = path.resolve(argv[++index]);
    } else if (arg === '--out-dir') {
      options.outDir = argv[++index];
    } else if (arg === '--stdout-json') {
      options.stdoutJson = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function writeIndex(rootDir, outDir, generatedAt) {
  const collected = collectRepoFiles(rootDir);
  const index = buildIndex(collected.files, generatedAt, {
    source: collected.source,
    sourceWarnings: collected.sourceWarnings
  });
  const absoluteOutDir = path.resolve(rootDir, outDir);
  fs.mkdirSync(absoluteOutDir, { recursive: true });
  const jsonPath = path.join(absoluteOutDir, '00-repo-index.json');
  const markdownPath = path.join(absoluteOutDir, '00-repo-index.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(index, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderMarkdown(index));
  return { index, jsonPath, markdownPath };
}

function printHelp() {
  console.log(`Usage: node .github/scripts/repo-index.js [--root <repo>] [--out-dir <dir>] [--stdout-json]

Generates:
  docs/ai/00-repo-index.md
  docs/ai/00-repo-index.json
`);
}

function main(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return;
  }
  if (options.stdoutJson) {
    const collected = collectRepoFiles(options.root);
    const index = buildIndex(collected.files, undefined, {
      source: collected.source,
      sourceWarnings: collected.sourceWarnings
    });
    console.log(JSON.stringify(index, null, 2));
    return;
  }
  const { jsonPath, markdownPath } = writeIndex(options.root, options.outDir);
  console.log(`Wrote ${path.relative(options.root, markdownPath)}`);
  console.log(`Wrote ${path.relative(options.root, jsonPath)}`);
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  buildIndex,
  collectRepoFiles,
  detectModules,
  gitLsFiles,
  hasCopiedBootstrapBundle,
  isCopiedBootstrapBundleFile,
  renderMarkdown,
  walkFilesystemFiles,
  writeIndex
};
