FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/db/package.json ./lib/db/

COPY artifacts/api-server/package.json ./artifacts/api-server/

RUN pnpm install --frozen-lockfile

COPY lib/api-zod ./lib/api-zod
COPY lib/api-spec ./lib/api-spec
COPY lib/db ./lib/db
COPY artifacts/api-server ./artifacts/api-server

RUN pnpm --filter @workspace/api-server run build

RUN mkdir -p /app/data

ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
