## 2026-09-06 - Prisma Sequential Query Optimization\n**Learning:** Running sequential independent database queries with Prisma causes unnecessary N+1 roundtrip delays over the network.\n**Action:** Use `Promise.all()` to parallelize independent database queries, especially in statistical summary or list endpoints with counts.

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

## 2026-09-20 - Global Debounce Anti-Pattern
**Learning:** Applying a global debounce to an entire filter state object slows down interactions for inputs that should be instant (like dropdowns and pagination), causing UI lag.
**Action:** Remove global debouncing on filter state. Implement targeted local debouncing directly on text inputs (like search bars) before updating parent state.

## 2026-09-21 - Parallelized chunk inserts with Promise.all
**Learning:** Sequential `for...of` loop over chunk arrays for batch operations (like `createManyAndReturn`) introduces unnecessary network roundtrips between chunk operations, which severely slows down bulk ingestion of thousands of records.
**Action:** Use `Promise.all()` to wrap and run chunked batch operations concurrently instead of processing them sequentially.

## 2026-09-22 - Controlled DB concurrency for chunked ingestion
**Learning:** While wrapping independent chunked DB inserts in an unbounded `Promise.all()` removes N+1 bottlenecks, doing so over large arrays causes severe database connection pool exhaustion (e.g. Prisma P2024 timeouts) and nondeterministic ordering bugs when aggregating results in callback functions.
**Action:** Always wrap concurrent DB operations using bounded concurrency (e.g. batching array chunks into smaller concurrent batches like 5) and wait for them sequentially, accumulating the promise results explicitly to maintain ordering and prevent DB connection timeouts.

## 2026-09-29 - Range Slider Continuous Events
**Learning:** Removing global filter debouncing to make dropdowns and pagination instant inadvertently causes `type="range"` inputs to fire `onChange` continuously while dragging, spamming the backend API with dozens of requests per second.
**Action:** When migrating from global to targeted debouncing, always explicitly debounce range sliders and text inputs locally before updating the parent state, ensuring instant interactions for other elements without causing an API DDoS.

## 2026-09-29 - Surgical Optimization Edits and No Scratch Script Commits
**Learning:** Running whole-file formatters or regenerating entire components while performing performance optimizations introduces massive whitespace/formatting diffs (1,000+ lines), masking the real optimization, invalidating git blame, and causing painful merge conflicts with concurrent PRs. Additionally, committing scratch benchmark or patch scripts (`patch_*.py`, `test.cjs`) pollutes production repositories and triggers CI guardrail failures.
**Action:** Restrict all algorithmic and performance optimizations to strictly scoped replacement chunks. Diff size must reflect only the functional optimization. Always clean up temporary benchmark or patch scripts with `git rm -f` before committing.

## 2024-10-02 - Enum values array allocation inside loops
**Learning:** Using `Object.values(Enum).includes()` inside a loop for parsing large datasets (like CSV payloads) causes redundant array allocations and O(n) lookups per row, severely degrading performance.
**Action:** Cache the Enum values as a `Set` at the module level (outside the function) and use `Set.has()` for constant-time lookups.

## 2026-10-04 - React component useMemo for static arrays
**Learning:** Using `useMemo` with an empty dependency array `[]` to cache static arrays or Enum mappings inside a component adds unnecessary React lifecycle overhead with no measurable benefit.
**Action:** Hoist static constants completely outside the functional component instead of using `useMemo`.

## 2026-10-06 - Native indexOf for String Parsing
**Learning:** Iterating characters in JS is slower than utilizing V8's native C++ indexOf method.
**Action:** Use while loops with indexOf for counting characters in large payloads.

## 2026-10-08 - Prisma createdAt Index
**Learning:** Adding an index to `createdAt` descending resolves O(N) sequential scan performance bottlenecks for default API queries.
**Action:** Always verify frequently sorted fields have an index in Prisma schema using `@@index([field(sort: Desc)])`.

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

## Additive Documentation & Scratch Cleanliness Directives
- **Strictly Additive Journal Updates**: When updating `.jules/*.md`, strictly append new dated entries (`## YYYY-MM-DD - Title`). NEVER delete, truncate, or overwrite historical learnings or previous entries.
- **Substantive Code Diff Requirement**: Pull requests must include substantive code changes in `src/`, `app/`, `lib/`, or `tests/`. Never open PRs that modify only `.jules/*.md` journals or root scratch scripts.
- **Zero Scratch File Commits**: Never commit `*.diff`, `*.patch`, `test_*.ts`, `test_*.js`, `test.cjs`, `fix_*.php`, or `patch_*.py` files. Always remove temporary debugging or verification scripts prior to committing.

## Scope Quarantine, Journaling & Security Test Invariants
- **Strictly Append-Only Journaling**: When adding learnings to `.jules/*.md`, append strictly at the end of the file. Do not rewrite, deduplicate, or remove lines beginning with `## YYYY-MM-DD`.
- **Surgical Scope Quarantine**: Modify only the files directly involved in the issue and their corresponding test fixtures. Do not delete, rename, or perform drive-by cleanups of unrelated root-level scripts or legacy files.
- **Coupled Test Fixture Awareness for Security Invariants**: When changing fail-open fallback behavior (such as hardening decryption to fail closed), always update upstream test mocks that rely on plaintext credentials or mock values.

## 2026-10-09 - DB Connection Pool Exhaustion in Promise.allSettled
**Learning:** Performing both concurrent LLM enrichment and concurrent Prisma database updates inside an unbounded `Promise.allSettled` block can cause connection pool exhaustion (e.g., Prisma P2024 timeouts).
**Action:** When processing batches of items that require both external API calls and database updates, run the external API calls concurrently using `Promise.allSettled`, collect the results, and then execute the subsequent database updates sequentially in a `for...of` loop to prevent database connection pressure.
