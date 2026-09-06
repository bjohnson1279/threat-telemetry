FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm@9.15.4

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile

COPY . .
RUN cd apps/worker && npx prisma generate
RUN pnpm --filter @threat-telemetry/shared build
RUN pnpm --filter @threat-telemetry/worker build

WORKDIR /app/apps/worker
CMD ["pnpm", "start"]
