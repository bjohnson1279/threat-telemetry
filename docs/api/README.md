# Threat Telemetry API Documentation

Comprehensive reference documentation for the Threat Telemetry Ingestion & Analyst Intelligence Gateway REST API.

## Base URL
```
http://localhost:8080/api/v1
```

## Authentication

All threat telemetry API endpoints require an API key header for authentication:

| Header | Type | Description |
| --- | --- | --- |
| `x-api-key` | string | Matches the configured `INTERNAL_API_KEY` environment variable. |

Requests with missing or invalid keys return `401 Unauthorized`. If `INTERNAL_API_KEY` is not configured on the server, requests return `500 Internal Server Configuration Error`.

## Rate Limiting

- **General API Limiter**: Applied globally across `/api/` endpoints (100 requests per 15-minute window per IP).
- **Enrichment Limiter**: Applied to `POST /api/v1/indicators/:id/enrich` (5 requests per 15-minute window per IP) to prevent LLM quota exhaustion.

## API Endpoints Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/v1/ingest` | Ingest raw threat indicators via JSON or CSV format |
| `GET` | `/api/v1/indicators` | Paginated and filtered indicator list |
| `GET` | `/api/v1/indicators/stats/summary` | Aggregated threat indicators metrics |
| `GET` | `/api/v1/indicators/:id` | Detailed record for a single threat indicator |
| `POST` | `/api/v1/indicators/:id/enrich` | Trigger LLM threat analysis and MITRE technique enrichment |

For full endpoint schemas, parameters, and examples, see [Indicators API Reference](./indicators.md).
