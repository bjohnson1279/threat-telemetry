## 2025-05-18 - Parallelizing Prisma DB Queries

**Learning:** When dealing with multiple independent reads in Prisma (like counting rows for pagination and fetching the page data, or running several groupBys/aggregations), Prisma queries can run concurrently via `Promise.all`. This codebase executes them sequentially by default.
**Action:** Always look for opportunities to replace sequential `await prisma...` queries with `Promise.all` arrays for independent data fetches to avoid sequential roundtrips.
## 2023-10-27 - Batching Database Inserts
**Learning:** Encountered an N+1 insertion anti-pattern in the feed loop where `newIndicators` were being iterated over and sequentially created one at a time via `prisma.threatIndicator.create`. This causes sequential database roundtrips that severely slow down the worker thread.
**Action:** When bulk processing records (like feed parsing or message bus consumers), ALWAYS favor `prisma...createMany()` over iterating through individual `prisma...create()` calls.
