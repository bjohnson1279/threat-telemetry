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
