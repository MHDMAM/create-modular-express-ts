import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { FEATURES, readmeSection, type FeatureId, type TextEdit } from './features.ts';
import { formatJson } from './json.ts';

/** Name the template ships with; replaced by the new project's name. */
export const TEMPLATE_NAME = 'modular-express-ts';
export const TEMPLATE_URL = 'https://github.com/MHDMAM/modular-express-ts';
/** Template version this CLI release is tested against. */
export const TEMPLATE_SOURCE = 'github:MHDMAM/modular-express-ts#v0.2.0';

const PACKAGE_NAME = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

export function validatePackageName(name: string): string | undefined {
  if (!name) return 'Project name is required';
  if (name.length > 214) return 'Project name must be at most 214 characters';
  if (!PACKAGE_NAME.test(name)) return 'Use lowercase letters, digits, "-", "." or "_" (npm package name rules)';
  return undefined;
}

const read = (dir: string, file: string) => readFileSync(join(dir, file), 'utf8');
const write = (dir: string, file: string) => (content: string) => writeFileSync(join(dir, file), content);
const readJson = (dir: string, file: string) => JSON.parse(read(dir, file));

function applyEdit(dir: string, file: string, pattern: RegExp, replacement: TextEdit['replacement']) {
  const content = read(dir, file);
  if (!pattern.test(content)) {
    throw new Error(`Template changed: ${pattern} not found in ${file}. Please report this issue.`);
  }
  write(dir, file)(content.replace(pattern, replacement as (substring: string, ...args: any[]) => string));
}

function configFiles(dir: string): string[] {
  const configDir = join(dir, 'src/config');
  return readdirSync(configDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => `src/config/${f}`);
}

function removeEmptyParents(dir: string, file: string) {
  let current = dirname(join(dir, file));
  while (current.startsWith(join(dir, 'src')) && current !== join(dir, 'src') && readdirSync(current).length === 0) {
    rmdirSync(current);
    current = dirname(current);
  }
}

/** Removes every feature that is not in `keep`. */
export function removeFeatures(dir: string, keep: FeatureId[]) {
  const removed = FEATURES.filter((f) => !keep.includes(f.id));
  if (removed.length === 0) return;

  for (const feature of removed) {
    for (const file of feature.files) {
      if (!existsSync(join(dir, file)))
        throw new Error(`Template changed: ${file} not found. Please report this issue.`);
      rmSync(join(dir, file));
      removeEmptyParents(dir, file);
    }
    for (const edit of feature.edits) applyEdit(dir, edit.file, edit.pattern, edit.replacement);
  }

  // Config sections owned by removed features
  const keys = removed.flatMap((f) => f.configKeys);
  for (const file of configFiles(dir)) {
    const config = readJson(dir, file);
    const before = Object.keys(config).length;
    keys.forEach((key) => delete config[key]);
    if (Object.keys(config).length !== before) write(dir, file)(formatJson(config));
  }

  // Dependencies
  const pkg = readJson(dir, 'package.json');
  for (const dep of removed.flatMap((f) => f.dependencies)) {
    if (!pkg.dependencies?.[dep])
      throw new Error(`Template changed: dependency ${dep} not found. Please report this issue.`);
    delete pkg.dependencies[dep];
  }
  write(dir, 'package.json')(JSON.stringify(pkg, null, 2) + '\n');

  // No connectors left: drop the whole README section
  if (!FEATURES.some((f) => f.connector && keep.includes(f.id))) {
    applyEdit(dir, 'README.md', readmeSection('Optional Connectors'), '');
  }
}

/** Turns the template into the user's project: name, metadata, README, license. */
export function personalize(dir: string, name: string) {
  // Scoped names ("@scope/app") are not valid in paths, Kafka client ids, etc.
  const shortName = name.replace(/^@[^/]+\//, '');

  const pkg = readJson(dir, 'package.json');
  const {
    name: _name,
    version: _version,
    description: _description,
    keywords: _keywords,
    author: _author,
    license: _license,
    ...rest
  } = pkg;
  const newPkg = { name, version: '0.1.0', private: true, description: '', license: 'UNLICENSED', ...rest };
  write(dir, 'package.json')(JSON.stringify(newPkg, null, 2) + '\n');

  if (existsSync(join(dir, 'package-lock.json'))) {
    const lock = readJson(dir, 'package-lock.json');
    lock.name = name;
    lock.version = '0.1.0';
    if (lock.packages?.['']) {
      lock.packages[''] = { ...lock.packages[''], name, version: '0.1.0', license: 'UNLICENSED' };
    }
    write(dir, 'package-lock.json')(JSON.stringify(lock, null, 2) + '\n');
  }

  for (const file of configFiles(dir)) {
    const content = read(dir, file);
    if (content.includes(TEMPLATE_NAME)) write(dir, file)(content.replaceAll(TEMPLATE_NAME, shortName));
  }

  let readme = read(dir, 'README.md');
  readme = readme.replace(/^# .*\n\n(?:.+\n)+/, `# ${name}\n\nCreated with [${TEMPLATE_NAME}](${TEMPLATE_URL}).\n`);
  readme = readme.replace(readmeSection('License'), '').trimEnd() + '\n';
  write(dir, 'README.md')(readme);

  rmSync(join(dir, 'LICENSE'), { force: true });
}

/**
 * Copies a local template (used for development and tests). Only git-tracked files are copied, so local-only files
 * (node_modules, build output, anything excluded from git) never end up in the new project.
 */
export function copyLocalTemplate(source: string, dir: string) {
  const result = spawnSync('git', ['ls-files', '-z'], { cwd: source, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Local template "${source}" must be a git repository.`);
  for (const file of result.stdout.split('\0').filter(Boolean)) {
    if (!existsSync(join(source, file))) continue; // deleted but not yet committed
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    cpSync(join(source, file), join(dir, file));
  }
}
