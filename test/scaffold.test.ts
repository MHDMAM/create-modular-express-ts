import assert from 'node:assert/strict';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { MANIFEST_VERSION, readFeatures, scaffoldTemplate, validatePackageName } from '../src/scaffold.ts';
import { freshTemplate, listFiles, readText } from './helpers.ts';

// Every feature combination is tested in the template itself (test/scaffold.test.ts there); these tests cover what
// the CLI does: read the template's feature list and run its scaffold script.

const dirs: string[] = [];
after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

async function template(): Promise<string> {
  const dir = await freshTemplate();
  dirs.push(dir);
  return dir;
}

describe('validatePackageName', () => {
  it('accepts npm package names and rejects invalid ones', () => {
    for (const name of ['my-app', 'app.v2', '@scope/app']) assert.equal(validatePackageName(name), undefined, name);
    for (const name of ['', 'My-App', 'my app', '@scope/', '.app']) assert.ok(validatePackageName(name), name);
  });
});

describe('readFeatures', () => {
  it("reads the template's optional features", async () => {
    const features = readFeatures(await template());
    // The list belongs to the template and grows with it, so only what every version has is named here
    const ids = features.map((f) => f.id);
    for (const id of ['http', 'mssql', 'kafka', 'hazelcast', 'redis']) assert.ok(ids.includes(id), id);
    assert.equal(new Set(ids).size, ids.length, 'feature ids are unique');
    for (const feature of features) assert.ok(feature.label && feature.hint, feature.id);
    assert.deepEqual(
      features.filter((f) => f.default).map((f) => f.id),
      ['http'],
    );
  });

  it('rejects a manifest version it does not support', async () => {
    const dir = await template();
    const manifest = JSON.parse(readText(dir, 'scaffold/features.json'));
    writeFileSync(join(dir, 'scaffold/features.json'), JSON.stringify({ ...manifest, version: MANIFEST_VERSION + 1 }));
    assert.throws(() => readFeatures(dir), /manifest is version 2, this CLI supports 1/);
  });
});

describe('scaffoldTemplate', () => {
  it("runs the template's scaffold script", async () => {
    const dir = await template();
    scaffoldTemplate(dir, '@acme/my-app', ['redis']);

    assert.equal(JSON.parse(readText(dir, 'package.json')).name, '@acme/my-app');
    assert.ok(readText(dir, 'README.md').startsWith('# @acme/my-app\n'));
    assert.ok(existsSync(join(dir, 'src/connectors/redis')));
    assert.ok(!existsSync(join(dir, 'src/connectors/kafka')));
    assert.ok(!listFiles(dir).some((file) => file.startsWith('scaffold/')), 'the scaffold folder is removed');
  });

  it("reports the script's errors", async () => {
    const dir = await template();
    assert.throws(() => scaffoldTemplate(dir, 'app', ['mongo']), /Scaffolding failed:\n.*Unknown feature\(s\): mongo/);
  });
});
