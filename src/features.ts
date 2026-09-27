/**
 * Removable parts of the template. Each feature must be removable as a unit: its files, the `default.json` config
 * sections it owns, its dependencies and the text it adds to shared files.
 *
 * Every text edit must match, otherwise scaffolding fails: that is how drift between this list and the template is
 * caught (see test/scaffold.test.ts).
 */

export type FeatureId = 'http' | 'mssql' | 'kafka' | 'hazelcast';

export interface TextEdit {
  file: string;
  pattern: RegExp;
  replacement: string;
}

export interface Feature {
  id: FeatureId;
  label: string;
  hint: string;
  /** Whether it is listed under "Optional Connectors" in the README. */
  connector: boolean;
  files: string[];
  dependencies: string[];
  /** Top-level keys owned by this feature in every `src/config/*.json` file. */
  configKeys: string[];
  edits: TextEdit[];
}

/** Matches a README bullet like `- **Kafka** (...)` including its wrapped lines. */
const readmeBullet = (name: string) => new RegExp(`^- \\*\\*${name}\\*\\*.*\\n(?: {2}.*\\n)*`, 'm');

/** Matches a README `## heading` section up to the next heading. */
export const readmeSection = (heading: string) => new RegExp(`^## ${heading}\\n[\\s\\S]*?(?=^## |(?![\\s\\S]))`, 'm');

export const FEATURES: Feature[] = [
  {
    id: 'http',
    label: 'Outbound HTTP',
    hint: 'HttpClient with retries, CircuitBreaker, ServiceRequester (axios)',
    connector: false,
    files: [
      'src/global/utils/HttpClient.ts',
      'src/global/utils/CircuitBreaker.ts',
      'src/global/utils/ServiceRequester.ts',
      'src/global/types/interfaces.ts',
    ],
    dependencies: ['axios'],
    configKeys: [],
    edits: [{ file: 'README.md', pattern: readmeSection('Outbound HTTP'), replacement: '' }],
  },
  {
    id: 'mssql',
    label: 'MSSQL',
    hint: 'connection pool with schema-aware query inputs (mssql)',
    connector: true,
    files: ['src/global/libs/Mssql.ts'],
    dependencies: ['mssql'],
    configKeys: ['db'],
    edits: [
      { file: 'README.md', pattern: readmeBullet('MSSQL'), replacement: '' },
      {
        file: 'README.md',
        pattern: /\(`DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_NAME`, `APP_NAME`\)/,
        replacement: '(`APP_NAME`)',
      },
    ],
  },
  {
    id: 'kafka',
    label: 'Kafka',
    hint: 'producer/consumer (kafkajs)',
    connector: true,
    files: ['src/global/libs/Kafka.ts', 'src/global/utils/kafka.ts'],
    dependencies: ['kafkajs'],
    configKeys: ['kafka'],
    edits: [
      { file: 'README.md', pattern: readmeBullet('Kafka'), replacement: '' },
      { file: 'src/app.ts', pattern: /^if \(config\.get\('kafka\.enabled'\)\).*\n/m, replacement: '' },
    ],
  },
  {
    id: 'hazelcast',
    label: 'Hazelcast',
    hint: 'distributed map cache (hazelcast-client)',
    connector: true,
    files: ['src/global/libs/Hazelcast.ts', 'src/global/utils/hazelcast.ts'],
    dependencies: ['hazelcast-client'],
    configKeys: ['hazelcast'],
    edits: [{ file: 'README.md', pattern: readmeBullet('Hazelcast'), replacement: '' }],
  },
];

export const FEATURE_IDS = FEATURES.map((f) => f.id);

export function isFeatureId(value: string): value is FeatureId {
  return (FEATURE_IDS as string[]).includes(value);
}
