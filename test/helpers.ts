import { cpSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { downloadTemplate } from 'giget';
import { copyLocalTemplate, TEMPLATE_SOURCE } from '../src/scaffold.ts';

/** Template under test: a local checkout via TEMPLATE_DIR, otherwise the pinned GitHub tag. */
export const TEMPLATE = process.env.TEMPLATE_DIR ?? TEMPLATE_SOURCE;

let cached: string | undefined;

/** Fetches the template once per test run and returns a fresh copy of it. */
export async function freshTemplate(): Promise<string> {
  if (!cached) {
    cached = mkdtempSync(join(tmpdir(), 'mets-template-'));
    if (process.env.TEMPLATE_DIR) copyLocalTemplate(process.env.TEMPLATE_DIR, cached);
    else await downloadTemplate(TEMPLATE_SOURCE, { dir: cached, force: true, silent: true });
  }
  const dir = mkdtempSync(join(tmpdir(), 'mets-app-'));
  cpSync(cached, dir, { recursive: true });
  return dir;
}

export function listFiles(dir: string, root = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === 'node_modules' || name === '.git') return [];
    return statSync(path).isDirectory() ? listFiles(path, root) : [relative(root, path).replaceAll('\\', '/')];
  });
}

export const readText = (dir: string, file: string) => readFileSync(join(dir, file), 'utf8');
