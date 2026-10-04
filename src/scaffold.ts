import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Template version this CLI release is tested against. */
export const TEMPLATE_SOURCE = 'github:MHDMAM/modular-express-ts#v0.5.0';

/**
 * Manifest version this CLI understands. The template describes its removable features in
 * `scaffold/features.json` and ships the script that removes them (`scaffold/scaffold.ts`); the CLI only reads the
 * feature list and runs that script, so it does not need to know the template's files.
 */
export const MANIFEST_VERSION = 1;

export interface Feature {
  id: string;
  label: string;
  hint: string;
  default: boolean;
}

const PACKAGE_NAME = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

export function validatePackageName(name: string): string | undefined {
  if (!name) return 'Project name is required';
  if (name.length > 214) return 'Project name must be at most 214 characters';
  if (!PACKAGE_NAME.test(name)) return 'Use lowercase letters, digits, "-", "." or "_" (npm package name rules)';
  return undefined;
}

/** Reads the optional features of the downloaded template. */
export function readFeatures(dir: string): Feature[] {
  const file = join(dir, 'scaffold/features.json');
  if (!existsSync(file)) throw new Error('This template has no scaffold/features.json; use a newer template version.');
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  if (manifest.version !== MANIFEST_VERSION) {
    throw new Error(
      `The template's feature manifest is version ${manifest.version}, this CLI supports ${MANIFEST_VERSION}. ` +
        'Update create-modular-express-ts.',
    );
  }
  return manifest.features.map(({ id, label, hint, default: isDefault }: Feature) => ({
    id,
    label,
    hint,
    default: isDefault,
  }));
}

/** Runs the template's own scaffold script: removes the other features, renames the project, removes itself. */
export function scaffoldTemplate(dir: string, name: string, features: string[]): void {
  const args = ['scaffold/scaffold.ts', '--name', name, '--features', features.join(',') || 'none'];
  const result = spawnSync(process.execPath, args, { cwd: dir, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`Scaffolding failed:\n${result.stderr || result.stdout || result.error}`);
  }
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
