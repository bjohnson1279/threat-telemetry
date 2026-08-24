FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm@9.15.4

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/worker apps/worker

RUN pnpm install
RUN cd apps/worker && npx prisma generate
RUN pnpm --filter @threat-telemetry/shared build
RUN pnpm --filter @threat-telemetry/worker build

WORKDIR /app/apps/worker
CMD ["pnpm", "start"]
