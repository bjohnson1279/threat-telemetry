## 2026-09-06 - Prevent Unrestricted Database Sorting (Query Manipulation)
**Vulnerability:** The API allowed users to sort threat indicators using any arbitrary string passed to the `sortBy` query parameter. This string was used directly in a Prisma `orderBy: { [sortBy]: sortOrder }` clause.
**Learning:** This exposes the application to query manipulation, which can allow attackers to infer hidden database schema structure, sort by unindexed/large columns causing database DoS, or trigger unhandled server errors by specifying non-existent columns.
**Prevention:** Always restrict sort columns using an allowlist or enum. In this monorepo, the shared Zod schema (`packages/shared/src/schemas.ts`) should strictly validate inputs via `z.enum()` rather than `z.string()` before values reach the database layer.
## 2026-09-09 - Sentinel: Fix Application Crash (DoS) Vulnerability
**Vulnerability:** DoS due to unhandled promise rejection in parsing csv content when express.text parser is missing
**Learning:** Ensure that payloads are correctly parsed using express built-in parsers. By omitting `express.text({ type: 'text/csv' })`, `req.body.toString()` threw an exception when an unauthenticated POST was sent with `Content-Type: text/csv`.
**Prevention:** Add `app.use(express.text({ type: 'text/csv' }));` globally or locally at the route level to handle csv requests.
## 2024-03-07 - [MEDIUM] Missing Input Validation for ID Parameters
**Vulnerability:** The endpoints `/api/v1/indicators/:id` and `/api/v1/indicators/:id/enrich` were accepting arbitrary string inputs for the `:id` parameter without validation. Since the database schema expects a UUID for the primary key, sending non-UUID strings to the Prisma client would result in unhandled database errors (HTTP 500) and potential information leakage if errors aren't perfectly scrubbed.
**Learning:** Even simple parameterized routes (`/:id`) require explicit validation matching the database schema (e.g., UUID) to ensure resilience against malformed inputs and prevent unnecessary DB queries.
**Prevention:** Always validate all path parameters using tools like `zod` and integrate them with the routing middleware (like the existing `validate` function) before passing them to the ORM.

## 2026-09-12 - [MEDIUM] Missing Type Coercion for Query Parameters
**Vulnerability:** The API endpoint `/api/v1/indicators` was accepting query parameters like `page`, `pageSize`, `minConfidence`, and `maxConfidence` that were mapped directly to Zod numeric validations (`z.number()`). Because Express receives query parameters as strings, this caused validation to fail unless type coercion was explicitly used.
**Learning:** When using Zod to validate query string parameters in Express, numeric fields must use `z.coerce.number()` because all incoming data is parsed as strings by default. Relying on strict `z.number()` causes requests to immediately fail validation, potentially breaking intended functional filters and creating a denial of service for those valid filter conditions.
**Prevention:** Always use `z.coerce.*` (like `z.coerce.number()` or `z.coerce.boolean()`) for query parameters or form data when mapping to strict type definitions in Zod schemas.

## 2026-09-12 - [MEDIUM] Unbounded Query Parameters (DoS Risk)
**Vulnerability:** The `pageSize` and `search` fields in the API filter schema lacked `.max()` bounds, allowing an attacker to request an arbitrary number of records (e.g., `pageSize=1000000`) or supply massive strings, leading to potential out-of-memory crashes and database performance degradation.
**Learning:** By default, `z.coerce.number()` and `z.string()` in Zod have no upper bound. Missing strict bounds on list requests and search inputs makes APIs susceptible to application-level DoS attacks.
**Prevention:** Always define explicit `.max()` constraints on pagination and search query parameters in Zod schemas.
## 2026-09-15 - Sentinel: Enforce Input Limits on Ingestion Payloads
**Vulnerability:** DoS and memory exhaustion due to unbounded bulk ingestion payloads and large payload sizes in JSON and CSV format
**Learning:** Even if the express body parser implements a byte size limit, massive logical bulk limits or unconstrained individual string/array field lengths can cause excessive DB load and memory exhaustion when mapping arrays to ORM models.
**Prevention:** Always enforce both maximum logical bounds on array lengths (`rawIndicators.length > 10000`) and Zod `.max()` on all inner structures like strings and arrays.
## 2026-09-16 - [CRITICAL] Missing Authentication on Sensitive Endpoints
**Vulnerability:** The API endpoints `/api/v1/ingest` and `/api/v1/indicators/:id/enrich` lacked any form of authentication, allowing unauthenticated attackers to ingest arbitrary threat data or trigger computationally expensive LLM enrichment jobs, leading to data poisoning or denial of service/financial exhaustion.
**Learning:** Internal APIs accessed by frontend components must still enforce authentication, such as an API key, to prevent unauthorized external actors from abusing the endpoints.
**Prevention:** Always apply authentication middleware (e.g., checking `x-api-key` against environment variables) to sensitive endpoints like data ingestion and external service triggers.
