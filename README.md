# Threat Telemetry Ingestion & Analyst Intelligence Gateway

## Architecture
```mermaid
graph TD
  A[Ingestion API] --> B[Message Queue]
  B --> C[Worker]
  C --> D[Database]
  C --> E[LLM Enrichment]
```

## Prerequisites
- Node.js >= 18.0.0
- pnpm (v9.x recommended)
- Docker & Docker Compose

## Quick Start
1. **Install dependencies**:
   ```bash
   pnpm install
   ```
2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
3. **Start local database container**:
   ```bash
   pnpm run docker:up
   ```
4. **Generate database client & push schema**:
   ```bash
   pnpm run db:generate
   pnpm run db:push
   ```
5. **(Optional) Seed initial data**:
   ```bash
   pnpm run db:seed
   ```
6. **Build all packages & applications**:
   ```bash
   pnpm build
   ```
7. **Start development services**:
   ```bash
   pnpm run dev:api     # Start Express API server (default port: 8080)
   pnpm run dev:web     # Start Vite React Web UI
   pnpm run dev:worker  # Start Background Worker service
   ```

## Environment Variables

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://threat_user:threat_pass_dev@127.0.0.1:5434/threat_telemetry` |
| `INTERNAL_API_KEY` | Secret API key required for API route authentication (`x-api-key` header) | `dev-secret-key` |
| `LLM_PROVIDER` | LLM service provider for indicator enrichment (`openai` or `anthropic`) | `openai` |
| `OPENAI_API_KEY` | API key for OpenAI LLM enrichment service | `sk-your-key-here` |
| `ANTHROPIC_API_KEY` | API key for Anthropic LLM enrichment service | `sk-ant-your-key-here` |
| `PORT` | API server listening port | `8080` |
| `FRONTEND_URL` | CORS allowed origin URL | `http://localhost:5173` |

## Available Scripts

From the repository root, you can run the following workspace scripts:

- `pnpm install` — Install all dependencies across the monorepo workspace.
- `pnpm build` — Build all workspace packages (`@threat-telemetry/shared`) and applications.
- `pnpm test` — Run unit and integration tests across all workspace packages.
- `pnpm run dev:api` — Start the API backend in development mode with auto-reload.
- `pnpm run dev:web` — Start the Web UI development server.
- `pnpm run dev:worker` — Start the background worker process.
- `pnpm run db:generate` — Generate Prisma client types for the API package.
- `pnpm run db:push` — Push the Prisma database schema to the database.
- `pnpm run db:seed` — Seed the database with mock threat intelligence indicators.
- `pnpm run docker:up` — Spin up local PostgreSQL container using Docker Compose.
- `pnpm run docker:down` — Stop local Docker containers.

## API Documentation

Complete documentation for all API endpoints, request schemas, parameters, authentication, and workflow examples is available in the API Reference Guide:

- 📖 **[Indicators API Reference Guide](docs/api/indicators.md)**

## Tech Stack
- **TypeScript** - End-to-end type safety across shared modules, backend, and frontend
- **Node.js & Express** - RESTful API backend
- **React & Vite & Tailwind CSS** - Analyst Web Portal interface
- **pnpm Workspaces** - Monorepo architecture (`apps/api`, `apps/web`, `apps/worker`, `packages/shared`)
- **Zod** - Runtime schema validation
- **Prisma & PostgreSQL** - ORM and relational database storage
- **Vitest** - Fast unit and integration testing runner
