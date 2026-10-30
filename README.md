# Threat Telemetry Ingestion & Analyst Intelligence Gateway

A high-performance monorepo platform for ingesting, processing, and enriching threat intelligence indicators in real time.

## System Architecture

```mermaid
graph TD
  A[Ingestion API / Clients] --> B[Express API Gateway]
  B --> C[PostgreSQL Database / Prisma]
  B --> D[Background Worker]
  D --> E[LLM Enrichment Service - OpenAI / Anthropic]
```

## Prerequisites

Ensure your local development machine meets the following requirements:
- **Node.js**: `>= 18.0.0`
- **Package Manager**: `pnpm` (v8+ recommended)
- **Containerization**: `Docker` and `Docker Compose`

---

## Environment Variables Configuration

Copy the sample environment file to `.env`:

```bash
cp .env.example .env
```

Configure the following environment variables in `.env`:

| Variable | Description | Example / Default Value | Required |
| --- | --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://threat_user:threat_pass_dev@127.0.0.1:5434/threat_telemetry` | **Required** |
| `INTERNAL_API_KEY` | Secret key for API authentication (`x-api-key` header) | `dev-secret-key` | **Required** |
| `LLM_PROVIDER` | AI provider for enrichment (`openai` or `anthropic`) | `openai` | Optional |
| `OPENAI_API_KEY` | OpenAI API key for threat enrichment | `sk-your-key-here` | Optional |
| `ANTHROPIC_API_KEY` | Anthropic API key for threat enrichment | `sk-ant-your-key-here` | Optional |
| `PORT` | API server HTTP port | `8080` | Optional |

---

## Quick Start & Local Development

Follow these steps to set up and run the repository locally:

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start Services (PostgreSQL Database)
```bash
pnpm run docker:up
```

### 3. Database Migration & Prisma Generation
```bash
# Push schema changes to local PostgreSQL instance
pnpm run db:push

# Generate Prisma Client types
pnpm --filter @threat-telemetry/api exec prisma generate
```

### 4. Run Development Servers
```bash
# Start API gateway in development mode
pnpm run dev:api

# Start Web frontend interface
pnpm --filter @threat-telemetry/web dev
```

---

## Workspace Scripts & Testing

- **Build Workspace**: Build all packages and applications.
  ```bash
  pnpm build
  ```
- **Run Test Suite**: Execute unit and integration tests across the workspace.
  ```bash
  pnpm test
  ```
- **Stop Docker Containers**:
  ```bash
  pnpm run docker:down
  ```

---

## Documentation Links

- [API Reference Guide](/docs/api/indicators.md): Detailed documentation of all API endpoints, authentication headers, request/response schemas, rate limits, and workflow usage.

---

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Node.js
- **Monorepo Tooling**: pnpm Workspaces
- **Backend Framework**: Express.js
- **Database & ORM**: PostgreSQL, Prisma
- **Validation**: Zod
- **Frontend**: React, Vite, Tailwind CSS
