FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm@9.15.4

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api

RUN pnpm install
RUN pnpm --filter @threat-telemetry/api prisma:generate
RUN pnpm --filter @threat-telemetry/shared build
RUN pnpm --filter @threat-telemetry/api build

EXPOSE 8080

WORKDIR /app/apps/api
CMD ["sh", "-c", "pnpm run prisma:push && pnpm start"]
