#!/usr/bin/env node
import * as p from '@clack/prompts';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { downloadTemplate } from 'giget';
import {
  copyLocalTemplate,
  readFeatures,
  scaffoldTemplate,
  TEMPLATE_SOURCE,
  validatePackageName,
  type Feature,
} from './scaffold.ts';

const HELP = `Usage: npm create modular-express-ts [directory] -- [options]

Options:
  --features <list>   Comma-separated feature ids (http, mssql, kafka, hazelcast, redis), or "none"
  --no-install        Skip installing dependencies
  --no-git            Skip "git init"
  --template <src>    Template source (giget syntax or a local directory)
  -y, --yes           Accept defaults for everything not given
  -h, --help          Show this help
  -v, --version       Show the CLI version
`;

function exitIfCancelled<T>(value: T, cleanup?: () => void): Exclude<T, symbol> {
  if (p.isCancel(value)) {
    cleanup?.();
    p.cancel('Cancelled.');
    process.exit(1);
  }
  return value as Exclude<T, symbol>;
}

/** Runs a command with fixed arguments (never user input); on Windows through the shell so `npm.cmd` resolves. */
function run(command: string, args: string[], cwd: string) {
  const result =
    process.platform === 'win32'
      ? spawnSync([command, ...args].join(' '), { cwd, stdio: 'pipe', shell: true })
      : spawnSync(command, args, { cwd, stdio: 'pipe' });
  if (result.status !== 0) {
    throw new Error(`"${command} ${args.join(' ')}" failed:\n${result.stderr?.toString() || result.error}`);
  }
}

/** Parses `--features`, checking the ids against the template's features. */
function parseFeatures(value: string, available: Feature[]): string[] {
  if (value.trim() === 'none') return [];
  const ids = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const valid = available.map((f) => f.id);
  const unknown = ids.filter((id) => !valid.includes(id));
  if (unknown.length) throw new Error(`Unknown feature(s): ${unknown.join(', ')}. Valid: ${valid.join(', ')}`);
  return ids;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    allowNegative: true,
    options: {
      features: { type: 'string' },
      install: { type: 'boolean' },
      git: { type: 'boolean' },
      template: { type: 'string' },
      yes: { type: 'boolean', short: 'y' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  });

  if (values.help) return void console.log(HELP);
  if (values.version) {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    return void console.log(pkg.version);
  }

  const yes = values.yes ?? false;
  p.intro('create-modular-express-ts');

  // Target directory / project name
  let target = positionals[0];
  if (!target) {
    target = yes
      ? 'my-app'
      : exitIfCancelled(
          await p.text({
            message: 'Project name',
            placeholder: 'my-app',
            defaultValue: 'my-app',
            validate: (value) => (value ? validatePackageName(value) : undefined),
          }),
        );
  }
  const dir = resolve(target);
  const name = basename(dir);
  const nameError = validatePackageName(name);
  if (nameError) throw new Error(`Invalid project name "${name}": ${nameError}`);
  if (existsSync(dir) && readdirSync(dir).length > 0) throw new Error(`Directory "${target}" is not empty.`);

  const createdDir = !existsSync(dir);
  const cleanup = () => createdDir && rmSync(dir, { recursive: true, force: true });
  const s = p.spinner();
  let install = true;
  try {
    // The template describes its own optional features, so it is downloaded before asking for them
    s.start('Downloading template');
    const source = values.template ?? TEMPLATE_SOURCE;
    if (existsSync(source)) copyLocalTemplate(resolve(source), dir);
    else await downloadTemplate(source, { dir, force: true, silent: true });
    s.stop('Template downloaded');

    const available = readFeatures(dir);
    const defaults = available.filter((f) => f.default).map((f) => f.id);
    const features =
      values.features !== undefined
        ? parseFeatures(values.features, available)
        : yes
          ? defaults
          : exitIfCancelled(
              await p.multiselect<string>({
                message: 'Optional features (space to toggle)',
                options: available.map((f) => ({ value: f.id, label: f.label, hint: f.hint })),
                initialValues: defaults,
                required: false,
              }),
              cleanup,
            );

    install =
      values.install ?? (yes ? true : exitIfCancelled(await p.confirm({ message: 'Install dependencies?' }), cleanup));
    const git =
      values.git ??
      (yes ? true : exitIfCancelled(await p.confirm({ message: 'Initialize a git repository?' }), cleanup));

    scaffoldTemplate(dir, name, features);
    p.log.success(`Features: ${features.length ? features.join(', ') : 'none'}`);

    // Keeps package-lock.json in sync with the removed dependencies
    s.start(install ? 'Installing dependencies' : 'Updating package-lock.json');
    run('npm', install ? ['install'] : ['install', '--package-lock-only', '--ignore-scripts'], dir);
    s.stop(install ? 'Dependencies installed' : 'package-lock.json updated');

    if (git) {
      run('git', ['init', '-q'], dir);
      p.log.success('Initialized git repository');
    }
  } catch (error) {
    s.error('Failed');
    cleanup();
    throw error;
  }

  const cd = relative(process.cwd(), dir);
  const steps = [cd && `cd ${cd.includes(' ') ? `"${cd}"` : cd}`, !install && 'npm install', 'npm run dev'];
  p.note(steps.filter(Boolean).join('\n'), 'Next steps');
  p.outro('Done.');
}

main().catch((error: Error) => {
  p.cancel(error.message);
  process.exit(1);
});
