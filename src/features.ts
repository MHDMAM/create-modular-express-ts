/**
 * Removable parts of the template. Each feature must be removable as a unit: its files (including tests), the
 * config sections it owns, its dependencies and the text it adds to shared files.
 *
 * Every text edit must match, otherwise scaffolding fails: that is how drift between this list and the template is
 * caught (see test/scaffold.test.ts).
 */

export type FeatureId = 'http' | 'mssql' | 'kafka' | 'hazelcast' | 'redis';

export interface TextEdit {
  file: string;
  pattern: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
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

/** Edits removing a connector from `src/connectors.ts`: its import and its entry in the `connectors` array. */
const unregisterConnector = (name: string, module: string): TextEdit[] => [
  {
    file: 'src/connectors.ts',
    pattern: new RegExp(`^import ${name} from '@libs/${module}';\\n`, 'm'),
    replacement: '',
  },
  {
    file: 'src/connectors.ts',
    pattern: new RegExp(`^(const connectors: Connector\\[\\] = \\[)([^\\]]*\\b${name}\\b[^\\]]*)(\\];)$`, 'm'),
    replacement: (_match, start, items, end) =>
      start +
      items
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item && item !== name)
        .join(', ') +
      end,
  },
];

export const FEATURES: Feature[] = [
  {
    id: 'http',
    label: 'Outbound HTTP',
    hint: 'ServiceRequester/HttpClient with retries and circuit breaker (axios, cockatiel)',
    connector: false,
    files: [
      'src/global/utils/HttpClient.ts',
      'src/global/utils/ServiceRequester.ts',
      'src/global/types/interfaces.ts',
      'test/http.test.ts',
    ],
    dependencies: ['axios', 'cockatiel'],
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
    hint: "producer, topic handlers, dead-letter topic (Confluent's official client)",
    connector: true,
    files: ['src/global/libs/Kafka.ts', 'test/kafka.test.ts'],
    dependencies: ['@confluentinc/kafka-javascript'],
    configKeys: ['kafka'],
    edits: [
      { file: 'README.md', pattern: readmeBullet('Kafka'), replacement: '' },
      ...unregisterConnector('kafka', 'Kafka'),
    ],
  },
  {
    id: 'hazelcast',
    label: 'Hazelcast',
    hint: 'distributed maps and cache (hazelcast-client)',
    connector: true,
    files: ['src/global/libs/Hazelcast.ts', 'test/hazelcast.test.ts'],
    dependencies: ['hazelcast-client'],
    configKeys: ['hazelcast'],
    edits: [
      { file: 'README.md', pattern: readmeBullet('Hazelcast'), replacement: '' },
      ...unregisterConnector('hazelcast', 'Hazelcast'),
    ],
  },
  {
    id: 'redis',
    label: 'Redis',
    hint: 'Redis/Valkey cache (redis)',
    connector: true,
    files: ['src/global/libs/Redis.ts', 'test/redis.test.ts'],
    dependencies: ['redis'],
    configKeys: ['redis'],
    edits: [
      { file: 'README.md', pattern: readmeBullet('Redis'), replacement: '' },
      ...unregisterConnector('redis', 'Redis'),
    ],
  },
];

export const FEATURE_IDS = FEATURES.map((f) => f.id);

export function isFeatureId(value: string): value is FeatureId {
  return (FEATURE_IDS as string[]).includes(value);
}
