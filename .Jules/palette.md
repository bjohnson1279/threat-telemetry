## 2023-11-09 - Accessibility focus states
**Learning:** Found missing focus states on `button` in `IndicatorTable.tsx` and `IndicatorDrawer.tsx`. Also missing ARIA labels on buttons meant to describe what is viewed or closed.
**Action:** Added `focus-visible` styles explicitly, added `aria-label`s. Ensure that for `IndicatorTable`, the property accessed matches the frontend interface expected property.

## 2025-03-08 - Accessibility of Input Controls
**Learning:** Found an accessibility pattern where `select` inputs lacked `aria-label` attributes and range inputs lacked semantic `<label>` associations in `FilterBar.tsx`. Also, range slider percentage outputs caused potential layout shift.
**Action:** Always add `aria-label` to form controls without visible text labels. Ensure custom range slider labels use `<label htmlFor="...">` and `id="..."`. Use `tabular-nums` for numeric values that change rapidly to prevent layout shift. Also add `aria-hidden="true"` to decorative icons. Ensure `focus-visible` states are used for keyboard navigation instead of generic `focus`.

## 2026-09-09 - Pagination Accessibility Improvement
**Learning:** Pagination controls often lack proper form labels for row size selection and ARIA live regions for page number changes, breaking screen reader navigation. Missing focus visible rings on pagination buttons make keyboard navigation difficult.
**Action:** Always use <label> tags linked by id/htmlFor to <select> elements, ensure interactive buttons have focus-visible styling, and wrap page indicators in aria-live="polite".

## 2026-09-11 - Add clear button to search input
**Learning:** Search inputs often contain complex queries, but users had to manually backspace or select all text to clear them, causing friction. A small interactive clear button makes filtering noticeably faster.
**Action:** Consistently add a clear button `(&times;)` with a proper `aria-label="Clear search"` to all non-trivial search inputs in the design system, ensuring it's conditionally rendered only when the input has a value.
## 2026-09-12 - [UX/Accessibility Improvements]\n**Learning:** Implementing semantic HTML attributes like `aria-busy="true"` and `role="progressbar"` with `aria-value*` drastically improves screen reader compatibility without needing any custom JavaScript logic or CSS changes.\n**Action:** Use existing ARIA standards for structural semantic improvements directly on layout placeholders/loading-states and visual indicators.
## 2026-09-15 - [Confidence Bar Accessibility Fix]
**Learning:** When building visual progress bars or gauges with standard DOM elements, using a semantically grouped container with `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` while hiding purely visual inner DOM elements from screen readers using `aria-hidden="true"` provides a much cleaner experience for assistive technologies.
**Action:** Apply this pattern consistently across all custom progress/gauge components instead of arbitrarily scattering ARIA attributes.

## 2026-09-16 - Keyboard shortcut visual hints
**Learning:** When adding keyboard shortcuts (like '/' to focus search), users often discover them by accident or not at all unless visually hinted. Adding a non-intrusive `<kbd>` hint directly in the input that disappears on typing provides excellent, non-blocking discoverability.
**Action:** When implementing global keyboard shortcuts for primary inputs, add a small, styled `<kbd>` element inside the input's visual bounds, hide it when the input has value to not interfere with text, and ensure the `aria-label` includes the shortcut hint.
## 2026-09-17 - [Add copy button to indicator drawer]
**Learning:** Analysts frequently need to copy IOC values (like IPs or hashes) to paste into external tools, so providing a one-click copy button next to the indicator value improves the workflow significantly. Adding immediate visual feedback (like swapping icons briefly) enhances the perceived reliability of this action.
**Action:** Always add a copy-to-clipboard button to key values in detail views or drawers, ensuring they have appropriate aria-labels and keyboard focus styling.
## 2026-09-18 - Inline Actions for Repetitive Workflows
**Learning:** Analysts frequently need to extract/copy indicator values (IPs, hashes) directly from lists. Opening a drawer or detail view just to copy a value adds unnecessary friction. Hiding inline actions (like a copy button) until row hover or focus provides the utility without cluttering the UI.
**Action:** Add inline copy buttons (with `opacity-0 group-hover:opacity-100 focus-visible:opacity-100`) to indicator values in list views to streamline analyst workflows.

## 2026-09-19 - Inline Copy for Raw Data blocks
**Learning:** Analysts frequently need to copy full JSON raw data payloads. A dedicated copy button next to raw code blocks improves the extraction workflow.
**Action:** Add dedicated copy buttons to raw data blocks or code blocks with visual feedback.

## 2026-09-21 - Hide decorative emojis from screen readers
**Learning:** Emojis used for purely visual purposes (like copy icons, decorative ✨ or 🤖) are often read aloud by screen readers, creating annoying and confusing auditory clutter.
**Action:** Always wrap decorative emojis in a `<span aria-hidden="true">`, or add `aria-hidden="true"` to their containing elements, when they don't provide extra semantic meaning.

## 2026-09-27 - Prevent focus loss on conditionally rendered elements
**Learning:** When a conditionally rendered interactive element (like a 'Clear search' button) unmounts upon activation, it causes sudden focus loss for keyboard users.
**Action:** Programmatically restore focus to a logical next element (e.g., the input field) using a React ref.
## 2026-09-29 - Dynamic aria-labels for ephemeral states
**Learning:** When using state-based visual indicators (like swapping a 📋 icon to a ✅ icon for 'copied'), screen readers might miss the ephemeral feedback if the `aria-label` remains static. Also, trapping/shifting focus to dialogs/drawers correctly helps accessibility immensely.
**Action:** Dynamically update `aria-label` and `title` based on ephemeral states, and ensure proper focus trapping/restoration when mounting/unmounting modals.

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

## 2026-09-29 - Scope Verification for Async Loading Attributes
**Learning:** Blindly injecting `disabled={loading}` or `aria-busy={loading}` into JSX/TSX buttons causes fatal TypeScript compilation errors (`TS2304: Cannot find name 'loading'`) when `loading` is not declared in component props, state hooks (`useState`), or mutation results. Furthermore, using temporary patch scripts (`fix_*.cjs`) to manipulate source code pollutes the git index.
**Action:** Before referencing any state identifier (such as `loading`, `isSubmitting`, `isPending`) in `disabled` or `aria-busy`, inspect the component scope. If no loading state is tracked, define it using `useState(false)` or check existing query/mutation hooks. Never bind undeclared variables. Always run `tsc --noEmit` locally and never commit temporary fix scripts.

## 2026-10-02 - Explicit Error States in Data Views
**Learning:** Silent failures in data tables create confusion. Users need explicit error messages rather than a generic 'No data' state when an API call fails.
**Action:** Always extract the 'error' state from data hooks and render a dedicated error UI with a 'Try Again' recovery action.
## 2026-10-04 - [Add Explicit Inline Error Feedback for Async Drawer Actions]
**Learning:** Silent failures in isolated overlay components (like drawers or modals) lead to severe user confusion since global error handlers (like toast notifications) may be visually disconnected or absent. We need explicit, localized error boundaries for complex async actions (like LLM enrichment).
**Action:** Always implement semantic, inline error states with `role="alert"` immediately adjacent to the action button inside the drawer, clearing the state on successful retry or component unmount.
## 2026-10-05 - Add tooltips and aria-busy to interactive elements
**Learning:** Icon-only buttons (like clear search or close drawer) provide `aria-label`s for screen readers, but mouse users lack visual context without a `title` attribute. Disabled buttons (like pagination) can be confusing without an explanation. Async actions need `aria-busy` so screen readers announce the processing state.
**Action:** Always add `title` attributes that mirror `aria-label`s on icon-only buttons. Add explanatory `title` attributes to disabled buttons to explain the state (e.g., 'First page reached'). Add `aria-busy={true}` to buttons executing async operations.
## 2026-10-07 - Prevent Focus Loss on Unmount
**Learning:** When conditionally rendering global 'Clear Filters' buttons, they unmount upon activation. This causes sudden focus loss for keyboard users, resetting focus to the document body.
**Action:** Always shift focus to a logical adjacent element (like the search input) using a React ref before clearing the state that causes the component to unmount.
