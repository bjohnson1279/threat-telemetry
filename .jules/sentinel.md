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

## Prevention Directives for Automated Refactoring
- **Never Overwrite Complete Files**: Always use range-scoped replacement chunks for edits to `schema.prisma`, `index.ts`, `public/index.php`, `db/schema.rb`, or DDL SQL scripts.
- **Do Not Remove Core Declarations**: Do not delete existing route registrations or database DDL tables.
- **Environment Isolation Compatibility**: When replacing fallback secrets, preserve test environment execution via `!getenv('APP_ENV')` or `getenv('APP_ENV') === 'testing'`.
- **No Scratch Files**: Never stage or commit `test_*.ts`, `test_*.js`, `test.cjs`, `fix_*.php`, or `test.js` files to git.
- **No Unresolved Conflict Markers**: Never stage or commit files containing Git merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`, `|||||||`). Always resolve conflicts cleanly before committing.

## Completeness & Verification Directives
- **Explicit Parameter & Contract Validation**: When creating or modifying API endpoints (Express, Fastify, Rails, Laravel), always implement explicit parameter and request body validation schemas (e.g. `z.string().uuid()`) to prevent unhandled 404/500 fallthroughs.
- **Database Indexing for Queries**: When addressing query bottlenecks or adding query lookup filters, always implement native database index migrations rather than loading collections into memory and performing array filtering (`.filter()`, `.select`).
- **Co-Occurring Dependency Auditing**: When bumping any dependency version, verify that other transitive dependencies do not carry high/critical security advisories (e.g. run `bundler-audit`, `npm audit`). Never introduce a version bump that breaks underlying framework APIs.
- **Self-Verification Before Commit**: Always run syntax checks (`bash -n` for shell scripts, `tsc --noEmit` for TypeScript, linter checks) and targeted test runners locally before opening or updating a PR.

## Hallucinatory Task & Empty PR Directives
- **Zero-Diff Task Termination**: If the requested optimization, refactor, or fix is ALREADY natively present in the target branch, DO NOT create an empty pull request or commit an acknowledgment PR. Exit the task cleanly without opening a PR.
- **No Journal-Only PRs**: Never open a pull request that only contains updates to .jules/*.md files without corresponding functional code changes and tests.
- **Stale Suggestion Guard**: Always verify the current code on `main`/`master` before planning changes. If no actionable diff is required, cancel task execution immediately.

## Assertiveness, Decisive PR Execution & Comparative Recommendations
- **Proactive & Decisive PR Submission**: Do NOT repeatedly pause to ask permission to open a pull request (e.g., avoid "Would you like me to open a PR for this?", "Can I submit the PR?", "Should I go ahead and create the PR?"). When an optimization, fix, or feature satisfies requirements, passes local test runners/linters, and preserves architectural invariants, proceed decisively to create and submit the Pull Request with a clear, structured summary and rationale.
- **Explicit Recommendations on Options**: When presenting multiple implementation strategies or architecture options (e.g., Option A vs. Option B), NEVER leave the choice open-ended or passive. Always make an explicit, reasoned recommendation (prefixed with `(Recommended)`) based on **overall technical effectiveness**:
  1. *Algorithmic & Complexity Gains*: Time and space complexity impact (O(N*M) -> O(N+M), reduction of nested scans).
  2. *Resource Overhead*: Heap allocations, memory pressure, and GC pause reduction.
  3. *Domain & Architecture Invariants*: Strict backward compatibility, contract stability, and prevention of regression risks.
  4. *Security & Reliability*: Input validation, cryptographic safety, and concurrency safety.
- **Lead with Recommended Path**: State clearly why the recommended solution delivers the highest net value and immediately execute or propose it as the primary course of action rather than asking open-ended questions.

## Scope Verification, Minimal Churn & CI Protection Directives
- **Scope Verification Before Variable Binding**: When adding interactive states or accessibility attributes (e.g. `disabled={loading}`, `aria-busy={loading}`, `isSubmitting`), NEVER assume a variable identifier exists. Always inspect component props, local state hooks (`useState`), or declaration scope first. If not defined, declare the state hook or reuse an existing scope variable. Never introduce TS2304 / TS2552 ("Cannot find name") compile errors.
- **Surgical Edits Only (No Whole-File Formatting)**: Never run whole-file code formatters (Prettier, Black, Pint, rustfmt) across unmodified lines. Changes must be strictly range-scoped and limited to the minimal AST block needed. Avoid noisy quote/whitespace churn that masks real logic changes and causes merge conflicts. Verify with `git diff -w` that non-functional churn is zero.
- **Zero Scratch File Commits**: Never stage or commit ad-hoc verification, patch, or debug scripts (`test.cjs`, `fix_*.cjs`, `fix_*.php`, `patch_*.py`, `patch_*.sh`, `scratch_*`). Execute checks via the project's native test commands (`npm test`, `pytest`, `phpunit`, etc.) and delete temporary scripts before creating git commits.
- **Never Weaken CI Workflows**: Do not modify `.github/workflows/**` to bypass failures (e.g. adding `|| true`, setting `continue-on-error: true`, or commenting out assertions). Always resolve the defect in the source code or test fixture.
- **Explicit Parameter & Variable Types**: In TypeScript files, avoid implicit `any` by always providing explicit types on functions, parameters, and arrow callbacks (e.g. `(id: string) => ...`). Verify zero type errors with `tsc --noEmit` before committing.

## 2026-09-29 - Non-Destructive Security Patching & CI Protection
**Learning:** Security patches must never weaken CI workflow files (`.github/workflows/**`) by appending `|| true` or `continue-on-error: true` to suppress test/build failures. Furthermore, when adding defensive type assertions or input validators in TypeScript, omitting explicit types can introduce `TS7006: Parameter implicitly has an 'any' type`.
**Action:** Never modify CI workflow definitions to bypass test failures; resolve the underlying issue in source code or test fixtures. Always provide explicit types on newly introduced parameters and helper functions. Ensure zero scratch scripts (`fix_*.php`, `test_*.js`) are committed.

## 2026-10-03 - [CRITICAL] Memory DoS via String Splitting for Validation
**Vulnerability:** When validating the size of massive payloads (like raw CSV strings) before processing, using `string.split('\n')` to count lines allocates a massive array in memory. For huge payloads, this can trigger an Out-Of-Memory (OOM) crash, creating a DoS vulnerability.
**Learning:** String splitting is not memory-safe for unbounded or extremely large inputs.
**Prevention:** Do not use `string.split('\n')` to count lines for DoS mitigation. Use HTTP middleware (like `body-parser` size limits) or memory-efficient iterative counting.

## 2026-10-04 - [CRITICAL] Memory DoS via String Splitting for Validation
**Vulnerability:** When validating the size of massive payloads (like raw CSV strings) before processing, using `string.split('
')` to count lines allocates a massive array in memory. For huge payloads, this can trigger an Out-Of-Memory (OOM) crash, creating a DoS vulnerability.
**Learning:** String splitting is not memory-safe for unbounded or extremely large inputs.
**Prevention:** Do not use `string.split('
')` to count lines for DoS mitigation. Use HTTP middleware (like `body-parser` size limits) or memory-efficient iterative counting.
