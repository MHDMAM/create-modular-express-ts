# create-modular-express-ts

Scaffold a new [modular-express-ts](https://github.com/MHDMAM/modular-express-ts) project (Express + TypeScript API with
auto-loaded modules, structured logging and optional connectors), keeping only the features you pick.

```sh
npm create modular-express-ts@latest my-app
```

You'll be asked for:

- **Project name** (used for the folder, `package.json` and config defaults)
- **Optional features**:
  - `http`: outbound HTTP stack (`HttpClient` with retries, `CircuitBreaker`, `ServiceRequester`)
  - `mssql`: MSSQL connection pool
  - `kafka`: Kafka producer/consumer
  - `hazelcast`: Hazelcast distributed map cache
- **Install dependencies** and **initialize git**

Unselected features are removed completely: their files, config sections, dependencies and README sections.

## Non-interactive use

```sh
npm create modular-express-ts@latest my-app -- --features http,kafka --no-git
```

| Option              | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| `--features <list>` | Comma-separated `http`, `mssql`, `kafka`, `hazelcast`, or `none` |
| `--no-install`      | Skip installing dependencies                                     |
| `--no-git`          | Skip `git init`                                                  |
| `--template <src>`  | Template source: giget syntax or a local git repository          |
| `-y`, `--yes`       | Accept defaults for everything not given (features: `http`)      |

## Development

```sh
npm test            # scaffolds every feature combination (downloads the pinned template)
npm run test:e2e    # builds the CLI, generates projects, installs, typechecks and tests them
```

Set `TEMPLATE_DIR=<path to a local modular-express-ts checkout>` to test against local template changes. Each CLI
release pins a template tag (`TEMPLATE_SOURCE` in `src/scaffold.ts`); the tests fail if the template no longer matches
the feature list in `src/features.ts`.

## License

[MIT](LICENSE)
