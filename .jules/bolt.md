## 2025-05-18 - Parallelizing Prisma DB Queries

**Learning:** When dealing with multiple independent reads in Prisma (like counting rows for pagination and fetching the page data, or running several groupBys/aggregations), Prisma queries can run concurrently via `Promise.all`. This codebase executes them sequentially by default.
**Action:** Always look for opportunities to replace sequential `await prisma...` queries with `Promise.all` arrays for independent data fetches to avoid sequential roundtrips.
