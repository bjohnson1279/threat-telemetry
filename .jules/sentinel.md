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
## 2026-09-19 - [HIGH] Prevent Financial Exhaustion/DoS via Missing Specific Rate Limits
**Vulnerability:** The LLM enrichment endpoint (`POST /api/v1/indicators/:id/enrich`) was only protected by the global API rate limiter (100 requests per 15 minutes). Since this endpoint performs computationally expensive external LLM API calls, an authenticated attacker or compromised client could exhaust API quotas and cause severe financial impact or service denial within the global limit.
**Learning:** Global rate limits are often too permissive for specific expensive or sensitive endpoints (e.g., those triggering LLMs, sending emails, or doing heavy cryptography).
**Prevention:** Always implement route-specific, stricter rate limiting (e.g., using `express-rate-limit`) on top of global limits for any endpoint that incurs financial cost or significant computational overhead.

## 2026-09-20 - [HIGH] API Key Timing Attack Vulnerability
**Vulnerability:** The API key validation in `apps/api/src/middleware/auth.ts` was using a simple string comparison (`apiKey !== validKey`) instead of a constant-time comparison, which is vulnerable to timing attacks allowing an attacker to guess the secret key character by character.
**Learning:** Comparing secrets such as API keys using regular equality operators evaluates strings character by character and stops at the first mismatched character, leaking the length of the matched prefix.
**Prevention:** Always use a constant-time comparison function like `crypto.timingSafeEqual` after verifying the lengths of the strings are equal. Both strings should be converted to buffers of equal length before comparison.

## 2026-09-22 - [HIGH] Missing Timeout on External API Calls
**Vulnerability:** External `fetch` calls to LLM providers (OpenAI/Anthropic) in `ThreatEnrichmentService` lacked timeout configurations. Native Node.js `fetch` does not time out by default, which can cause the enrichment worker or API endpoints to hang indefinitely if the provider is unresponsive, leading to connection exhaustion and DoS.
**Learning:** Always provide an `AbortSignal.timeout()` when calling external HTTP APIs to ensure your service fails fast and securely unblocks resources.
**Prevention:** Use `signal: AbortSignal.timeout(ms)` in all external `fetch` calls.

## 2026-09-22 - [MEDIUM] Overly Permissive CORS Configuration
**Vulnerability:** CORS in the Express API was strictly hardcoded to `http://localhost:5173`. While safe for local development, this creates severe deployment bottlenecks. Developers often "fix" this bottleneck in staging or production by switching to a wildcard `origin: '*'`, which exposes the API to unauthorized cross-origin requests.
**Learning:** Hardcoding restrictive settings that break in production often leads to developers completely bypassing security controls (like using wildcards) just to get things working.
**Prevention:** Drive CORS configurations dynamically via environment variables (e.g., `process.env.FRONTEND_URL`) so that production URLs can be safely explicitly allowed without resorting to wildcards.
