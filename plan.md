1. *Add database indexes in Prisma schema*
   - Modify `apps/api/prisma/schema.prisma` to include native `@@index` declarations for frequently queried and filtered fields (`severity`, `indicatorType`, `indicatorValue`, `confidenceScore`). This replaces the need for manual raw SQL migrations mentioned in the comments.
2. *Verify database schema generation and build*
   - Run `pnpm db:generate` to regenerate the Prisma client with the new indexes.
   - Run `pnpm test` to ensure no functionality is broken by this schema addition.
3. *Complete pre commit steps*
   - Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.
4. *Submit the change.*
   - Once verified, I will submit the PR with a descriptive commit message documenting the expected impact.
