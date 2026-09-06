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
RUN pnpm --filter @threat-telemetry/api prisma:generate
RUN pnpm --filter @threat-telemetry/shared build
RUN pnpm --filter @threat-telemetry/api build

EXPOSE 8080

WORKDIR /app/apps/api
CMD ["sh", "-c", "pnpm run prisma:push && pnpm start"]
