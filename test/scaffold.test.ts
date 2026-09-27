import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { FEATURES, FEATURE_IDS, type FeatureId } from '../src/features.ts';
import { formatJson } from '../src/json.ts';
import { personalize, removeFeatures, TEMPLATE_NAME, validatePackageName } from '../src/scaffold.ts';
import { freshTemplate, listFiles, readText } from './helpers.ts';

/** `src/global/libs/Kafka.ts` -> `@libs/Kafka`, the alias other files import it by. */
function importAlias(file: string): string {
  const aliases: Record<string, string> = { libs: '@libs', utils: '@utils', types: '@lTypes' };
  const [, folder, name] = file.match(/^src\/global\/(\w+)\/(\w+)\.ts$/)!;
  return `${aliases[folder]}/${name}`;
}

const subsets: FeatureId[][] = Array.from({ length: 2 ** FEATURE_IDS.length }, (_, mask) =>
  FEATURE_IDS.filter((_, i) => mask & (1 << i)),
);

const dirs: string[] = [];
after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe('formatJson', () => {
  it('reproduces every template config file byte for byte', async () => {
    const dir = await freshTemplate();
    dirs.push(dir);
    for (const file of listFiles(dir).filter((f) => /^src\/config\/.*\.json$/.test(f))) {
      const text = readText(dir, file);
      assert.equal(formatJson(JSON.parse(text)), text, file);
    }
  });
});

describe('validatePackageName', () => {
  it('accepts npm package names and rejects invalid ones', () => {
    for (const name of ['my-app', 'app.v2', '@scope/app']) assert.equal(validatePackageName(name), undefined, name);
    for (const name of ['', 'My-App', 'my app', '@scope/', '.app']) assert.ok(validatePackageName(name), name);
  });
});

describe('scaffold', () => {
  for (const keep of subsets) {
    it(`keeps [${keep.join(', ') || 'none'}]`, async () => {
      const dir = await freshTemplate();
      dirs.push(dir);
      removeFeatures(dir, keep);
      personalize(dir, '@acme/my-app');

      const files = listFiles(dir);
      const sources = files.filter((f) => f.startsWith('src/') && f.endsWith('.ts'));
      const pkg = JSON.parse(readText(dir, 'package.json'));
      const readme = readText(dir, 'README.md');

      for (const feature of FEATURES) {
        const kept = keep.includes(feature.id);
        for (const file of feature.files) assert.equal(existsSync(join(dir, file)), kept, file);
        for (const dep of feature.dependencies) assert.equal(dep in pkg.dependencies, kept, dep);
        if (kept) continue;
        for (const file of feature.files) {
          const alias = importAlias(file);
          for (const src of sources) assert.ok(!readText(dir, src).includes(`'${alias}'`), `${src} imports ${alias}`);
        }
        for (const config of files.filter((f) => f.startsWith('src/config/'))) {
          const json = JSON.parse(readText(dir, config));
          for (const key of feature.configKeys) assert.ok(!(key in json), `${config} still has "${key}"`);
        }
      }

      const hasConnector = FEATURES.some((f) => f.connector && keep.includes(f.id));
      assert.equal(readme.includes('## Optional Connectors'), hasConnector);
      assert.equal(readme.includes('## Outbound HTTP'), keep.includes('http'));
      assert.ok(readme.startsWith('# @acme/my-app\n'));
      assert.ok(!readme.includes('## License'));
      assert.ok(!readme.includes('\n\n\n'), 'README has no stray blank lines');
      assert.ok(!existsSync(join(dir, 'LICENSE')));

      assert.equal(pkg.name, '@acme/my-app');
      assert.equal(pkg.private, true);
      assert.equal(pkg.author, undefined);
      assert.equal(JSON.parse(readText(dir, 'package-lock.json')).name, '@acme/my-app');

      // The template name only survives in the README credit line
      for (const file of files.filter((f) => f !== 'README.md' && f !== 'package-lock.json')) {
        assert.ok(!readText(dir, file).includes(TEMPLATE_NAME), `${file} still mentions ${TEMPLATE_NAME}`);
      }
      assert.match(readText(dir, 'src/config/default.json'), /"APP_NAME": "my-app"/);
    });
  }
});
