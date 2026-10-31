# Threat Telemetry Ingestion & Analyst Intelligence Gateway

A high-performance threat intelligence gateway for ingesting, querying, and enriching threat indicators (IoCs) across network logs, SIEMs, and analyst workflows.

## Architecture
```mermaid
graph TD
  A[Ingestion API] --> B[Message Queue]
  B --> C[Worker]
  C --> D[Database]
  C --> E[LLM Enrichment]
```

## Documentation
- [API Documentation Overview](docs/api/README.md)
- [Indicators & Ingestion API Reference](docs/api/indicators.md)

## Prerequisites
- Node.js >= 18.0.0
- pnpm >= 9.x
- Docker & Docker Compose

## Environment Variables

Copy `.env.example` to `.env` in the repository root:

```bash
cp .env.example .env
```

| Variable | Description | Default / Example | Required |
| --- | --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://threat_user:threat_pass_dev@127.0.0.1:5434/threat_telemetry` | Yes |
| `INTERNAL_API_KEY` | Secret key for authenticating API requests via `x-api-key` | `dev-secret-key` | Yes |
| `PORT` | Port for the API HTTP server | `8080` | No (default: `8080`) |
| `LLM_PROVIDER` | LLM enrichment provider (`openai` or `anthropic`) | `openai` | No (default: `openai`) |
| `OPENAI_API_KEY` | OpenAI API key for LLM threat enrichment | `sk-...` | Optional (if using OpenAI) |
| `ANTHROPIC_API_KEY` | Anthropic API key for LLM threat enrichment | `sk-ant-...` | Optional (if using Anthropic) |
| `FRONTEND_URL` | Allowed origin URL for CORS configuration | `http://localhost:5173` | No |

## Quick Start

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

3. **Start PostgreSQL database with Docker**:
   ```bash
   pnpm run docker:up
   ```

4. **Generate Prisma client**:
   ```bash
   pnpm run db:generate
   ```

5. **Push schema migrations to the database**:
   ```bash
   pnpm run db:push
   ```

6. **(Optional) Seed initial data**:
   ```bash
   pnpm run db:seed
   ```

7. **Start development services**:
   ```bash
   # Run the API server
   pnpm run dev:api

   # In a separate terminal, run the web UI
   pnpm run dev:web

   # In a separate terminal, run the background worker
   pnpm run dev:worker
   ```

## Repository Scripts

| Script | Command | Description |
| --- | --- | --- |
| `dev:api` | `pnpm --filter @threat-telemetry/api dev` | Start API server in dev mode with hot reload |
| `dev:web` | `pnpm --filter @threat-telemetry/web dev` | Start Web dashboard via Vite dev server |
| `dev:worker` | `pnpm --filter @threat-telemetry/worker dev` | Start background worker service |
| `build` | `pnpm -r build` | Build all workspace packages and apps |
| `test` | `pnpm -r test` | Run test suites across all workspace packages |
| `db:generate` | `pnpm --filter @threat-telemetry/api prisma:generate` | Generate Prisma client from schema |
| `db:push` | `pnpm --filter @threat-telemetry/api prisma:push` | Push Prisma schema changes directly to PostgreSQL |
| `db:seed` | `pnpm --filter @threat-telemetry/api prisma:seed` | Seed database with demo threat indicators |
| `docker:up` | `docker compose up -d` | Start background PostgreSQL container |
| `docker:down` | `docker compose down` | Stop and tear down docker containers |

## Tech Stack
- **Backend**: Node.js, Express, TypeScript, Zod, Prisma ORM
- **Database**: PostgreSQL
- **Frontend**: React, Vite, Tailwind CSS
- **Worker & Services**: TypeScript, LLM enrichment (OpenAI / Anthropic)
- **Monorepo Tooling**: pnpm workspaces, Vitest
