[![Lifecycle:Experimental](https://img.shields.io/badge/Lifecycle-Experimental-339999)](https://github.com/bcgov/repomountie/blob/master/doc/lifecycle-badges.md)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![CI](https://github.com/bcgov/wildlife-accident-reporting/actions/workflows/ci.yml/badge.svg)](https://github.com/bcgov/wildlife-accident-reporting/actions/workflows/ci.yml)
[![Issues](https://img.shields.io/github/issues/bcgov/wildlife-accident-reporting)](/../../issues)
[![Pull Requests](https://img.shields.io/github/issues-pr/bcgov/wildlife-accident-reporting)](/../../pulls)

# Wildlife Accident Reporting System (WARS)

Web application for analyzing wildlife-vehicle collision data on BC highways.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Fastify, Kysely, PostgreSQL + PostGIS |
| Frontend | React, Vite, TailwindCSS |
| Auth | Keycloak / JWT |
| Testing | Vitest, MSW |
| CI/CD | GitHub Actions, Helm, OpenShift |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.3.9
- [Docker](https://www.docker.com/) and Docker Compose

### Quick Start

```sh
cp .env.example .env
# Fill in the values in .env

docker compose pull && docker compose up -d
bun install
bun run migrate
bun run seed
```

The seed script loads service area polygons from GeoJSON, then inserts incident records from CSV and assigns service areas via spatial join.

### Common Commands

| Command | Description |
|---------|-------------|
| `bun run migrate` | Run database migrations |
| `bun run migrate:rollback` | Rollback last migration |
| `bun run seed` | Seed database (service areas + incidents) |
| `bun run seed:dry-run` | Preview seed without writing to DB |
| `bun run test` | Run tests in watch mode |
| `bun run test:run` | Run tests once (CI) |
| `bun run typecheck` | Type check server and client |
| `bun run fix` | Format and lint (Biome) |

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

[Issues](/../../issues) and [Pull Requests](/../../pulls) are welcome.

## License

[Apache 2.0](LICENSE)
