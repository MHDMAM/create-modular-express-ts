import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { TEMPLATE } from '../helpers.ts';

const CLI = join(import.meta.dirname, '../../dist/index.js');
const root = mkdtempSync(join(tmpdir(), 'mets-e2e-'));
after(() => rmSync(root, { recursive: true, force: true }));

function run(command: string, args: string[], cwd: string) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
}

// Every feature alone, none and all: each generated project must install, typecheck, pass its tests and be formatted
const combinations = ['none', 'http', 'mssql', 'kafka', 'hazelcast', 'http,mssql,kafka,hazelcast'];

describe('create-modular-express-ts', { concurrency: 1 }, () => {
  for (const features of combinations) {
    it(`generates a working project with --features ${features}`, { timeout: 600_000 }, () => {
      const name = `app-${features.replaceAll(',', '-')}`;
      run('node', [CLI, name, '--features', features, '--template', TEMPLATE, '--no-git', '--install'], root);
      const dir = join(root, name);
      run('npm', ['run', 'typecheck'], dir);
      run('npm', ['test'], dir);
      run('npx', ['prettier', '--check', '.', '--ignore-path', '.gitignore'], dir);
    });
  }
});
