1. **Fix CI Build Failure**: The CI pipeline fails during `pnpm build` in `apps/worker` with `Module '"@prisma/client"' has no exported member 'PrismaClient'`. This happens because Prisma relies on generating the client using `prisma generate` before it can be used, and the CI workflow does not currently run this command.
2. Update `.github/workflows/ci.yml` to insert a step running `pnpm run db:generate` between `Install Dependencies` and `Build Packages`. This satisfies the instruction memory: "When building the project in a fresh environment or CI workflow (.github/workflows/ci.yml), ensure pnpm run db:generate is executed before pnpm build to generate the Prisma client...".
3. **Complete pre-commit steps**
   - Run tests, check types, etc.
4. **Submit change**
