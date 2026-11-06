[Output truncated for brevity]

n Guard**: Always verify the current code on `main`/`master` before planning changes. If no actionable diff is required, cancel task execution immediately.

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

- **Strict Lowercase Directory Casing**: Always write learning notes to lowercase `.jules/<bot>.md`. Never create, commit, or reference uppercase `.Jules/`.

- **Clean Markdown Formatting**: Always append journal entries using actual newline characters, never literal string escape sequences `\n`.

## 2026-10-10 - Concurrent API calls with sequential database updates
**Learning:** When processing batches of items requiring both external API calls and database updates, avoid separating them into a concurrent API phase followed by a sequential DB phase if it forces waiting for the slowest API call before starting any database writes. Instead, keep the DB update chained directly after its respective API call (using Promise.all or similar) to allow interleaving, but strictly limit overall concurrency (e.g., using p-limit or chunked batches) to prevent database connection pool exhaustion.
**Action:** Use Promise.all with embedded DB updates (handling errors via try/catch inside the map function) combined with strict batch size limits rather than splitting operations across separate loops.

## 2024-05-15 - Worker DB Updates Concurrency
**Learning:** Running external API calls fully concurrently and then running DB updates sequentially (by awaiting `Promise.all` over the API calls and looping the results) introduces an unnecessary bottleneck: the DB updates cannot start until the *slowest* API call in the batch completes.
**Action:** Chain the database update immediately inside the `map` callback mapping over the items and then use `Promise.all`. This allows interleaving of the database updates, so as soon as an API call finishes, its DB update can happen while other API calls are still waiting. Wait for the `Promise.all` to maintain the batch size limit constraint to avoid database connection pool exhaustion.

## 2024-10-25 - React background polling loading states
**Learning:** Polling hooks that reset global `loading` state to `true` on every fetch cause artificial component re-renders (like data tables flickering or freezing via `pointer-events-none`) for users, breaking UX and wasting CPU cycles.
**Action:** Always provide an `isBackground` flag or separate background state for polling intervals to bypass global foreground loading indicators, preserving interactivity and preventing wasteful Virtual DOM diffing.

## 2026-10-15 - Cache Stampede Prevention
**Learning:** When using simple TTL caching on expensive endpoints, multiple concurrent requests during the expiration window will all trigger the heavy database query simultaneously, causing a Thundering Herd.
**Action:** Implement Promise memoization alongside the TTL cache. Store the in-flight Promise globally so concurrent requests can await the same database execution instead of spawning duplicate queries.

## 2026-10-20 - Zod validation overhead in hot loops
**Learning:** Using robust validation libraries like Zod inside a hot loop (like processing each line of a 100,000+ row CSV) introduces significant overhead due to heavy object allocation and schema parsing logic. This can severely block the Node.js event loop during bulk data ingestion.
**Action:** Replace Zod validation with native JavaScript conditional checks (checking lengths, types, and boundaries directly) inside the hot loop to drastically reduce processing time, while still enforcing the same limits.

## 2026-10-25 - Prevent Memory Bloat in Prisma bulk inserts
**Learning:** By default, Prisma's `createManyAndReturn` fetches all columns for every inserted row. During bulk data ingestion where only the IDs are required, this causes silent memory bloat and massive database network serialization overhead.
**Action:** Always append `select: { id: true }` to `createManyAndReturn` when only the generated IDs are needed.

## 2026-11-05 - Avoid Unnecessary Object Updates in React Polling
**Learning:** Polling hooks often trigger re-renders even when the underlying data is identical because `fetch` returns a new object reference on every network request. Naively calling `setState(newData)` forces all downstream React components to re-render, blocking the main thread and wasting CPU cycles.
**Action:** For React performance optimization during background polling, prevent unnecessary component re-renders when the fetched data hasn't changed by using a functional state setter with a shallow equality check (e.g., `setState(prev => (prev.value === newData.value ? prev : newData))`) to explicitly preserve the previous state reference.

## 2024-11-06 - Optimized detectIndicatorType regex overhead
**Learning:** Re-evaluating multiple regex objects inside a hot loop (like bulk processing or CSV ingestion) introduces significant CPU overhead and blocks the Node event loop.
**Action:** Always hoist regex instantiations outside of tight loop functions to avoid continuous recompilation. Additionally, use `.length` or early exit heuristics to bypass regex evaluations entirely for inputs where it's known to fail (e.g. hash length checks before running SHA256 test).
