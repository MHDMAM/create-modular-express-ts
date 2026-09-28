# create-modular-express-ts

Scaffold a new [modular-express-ts](https://github.com/MHDMAM/modular-express-ts) project (Express + TypeScript API with
auto-loaded modules, structured logging and optional connectors), keeping only the features you pick.

```sh
npm create modular-express-ts@latest my-app
```

You'll be asked for:

- **Project name** (used for the folder, `package.json` and config defaults)
- **Optional features**:
  - `http`: `ServiceRequester`/`HttpClient` with retries, `Retry-After` and a circuit breaker (axios, cockatiel)
  - `mssql`: MSSQL connection pool
  - `kafka`: Kafka producer, topic handlers and dead-letter topic (Confluent's official client)
  - `hazelcast`: Hazelcast distributed maps and cache
  - `redis`: Redis/Valkey cache
- **Install dependencies** and **initialize git**

Unselected features are removed completely: their code and tests, dependencies, environment variables, connector
registration and documentation. The template itself describes its features (`scaffold/features.json`) and ships the
script that removes them; the CLI downloads the template, asks which features to keep and runs that script.

## Non-interactive use

```sh
npm create modular-express-ts@latest my-app -- --features http,kafka --no-git
```

| Option              | Description                                                               |
| ------------------- | ------------------------------------------------------------------------- |
| `--features <list>` | Comma-separated `http`, `mssql`, `kafka`, `hazelcast`, `redis`, or `none` |
| `--no-install`      | Skip installing dependencies                                              |
| `--no-git`          | Skip `git init`                                                           |
| `--template <src>`  | Template source: giget syntax or a local git repository                   |
| `-y`, `--yes`       | Accept defaults for everything not given (features: `http`)               |

## Development

Requires Node.js 24 (`.nvmrc`). CI runs the unit tests on every push and pull request, and the end-to-end tests after
them; Renovate opens monthly dependency update PRs.

```sh
npm test            # reads the template's feature list and runs its scaffold script (downloads the pinned template)
npm run test:e2e    # builds the CLI, generates projects, installs, typechecks and tests them
```

Set `TEMPLATE_DIR=<path to a local modular-express-ts checkout>` to test against local template changes. Each CLI
release pins a template tag (`TEMPLATE_SOURCE` in `src/scaffold.ts`). Every feature combination is tested in the
template repository, so a template release needs a CLI change only when the manifest format (`MANIFEST_VERSION`) or the
script's arguments change.

## License

[MIT](LICENSE)
