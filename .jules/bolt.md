## 2026-09-06 - Prisma Sequential Query Optimization\n**Learning:** Running sequential independent database queries with Prisma causes unnecessary N+1 roundtrip delays over the network.\n**Action:** Use `Promise.all()` to parallelize independent database queries, especially in statistical summary or list endpoints with counts.

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
- **Stale Suggestion Guard**: Always verify the current code on `main`/`master` before planning changes. If no actionable diff is required, cancel task execution immediately.

## 2026-09-12 - Prisma batch insertion optimization
**Learning:** Using `prisma.$transaction` with an array of `prisma.create` queries performs sequential inserts leading to an N+1 performance bottleneck during ingestion.
**Action:** Use `prisma.createManyAndReturn` (or `createMany`) to batch insert multiple rows in a single query, significantly reducing database roundtrips.

## 2026-09-15 - Prisma Database Indexes
**Learning:** Raw SQL migrations documented in comments or standalone files can be missed by ORM schema generation. Missing database indexes on frequently queried fields like `severity`, `indicatorType`, and `confidenceScore` leads to sequential table scans and N+1 query bottlenecks as the dataset grows.
**Action:** Use native Prisma schema `@@index` declarations (like `@@index([severity])` and `@@index([mitreTechniques], type: Gin)`) to ensure indexes are consistently managed and applied by the ORM during deployment.

## 2026-09-17 - Backend caching for frontend polling
**Learning:** Frequent polling from frontend components (e.g. stats panels via `setInterval`) creates substantial database load when fetching heavy aggregations.
**Action:** Implement simple, short-TTL in-memory caching directly in the backend endpoint serving the polled data to decouple polling frequency from database load.

## 2026-09-17 - React component re-rendering
**Learning:** In lists like IndicatorTable and frequently polled components like StatsCards, stateless presentation components are re-rendered unnecessarily on every data update.
**Action:** Use `React.memo()` to wrap presentation components (e.g., SeverityBadge, ConfidenceBar, MitreTags) to prevent costly DOM re-renders when parent state updates.

## 2026-09-18 - React List Row Memoization
**Learning:** In lists like `IndicatorTable` that map over large arrays (e.g., up to 100 items), anonymous mapping functions or unmemoized row components cause every single row to undergo a virtual DOM re-render when any parent state (like the `selectedIndicator` for a side drawer) changes. This creates a severe rendering bottleneck.
**Action:** Extract list items (like table rows) into their own distinct stateless functional components (e.g., `IndicatorRow`) and wrap them in `React.memo()`. Pass stable props (like primitive data or unchanged objects) to ensure unchanged rows skip rendering entirely.
