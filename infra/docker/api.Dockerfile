# syntax=docker/dockerfile:1
# API image. Build from the repository root:
#   docker build -f infra/docker/api.Dockerfile -t annecto-grid-api .

FROM node:22-alpine AS build
# Same pnpm version as "packageManager" in package.json.
RUN npm install -g pnpm@10.28.0
WORKDIR /repo
# Fetch dependencies from the lockfile only, so this layer is cached until the lockfile changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm fetch
COPY . .
RUN pnpm install --offline --frozen-lockfile --filter "@annecto-grid/api..." \
 && pnpm --filter @annecto-grid/api build

FROM node:22-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
ARG APP_VERSION=
ARG GIT_COMMIT=unknown
ENV APP_VERSION=${APP_VERSION} GIT_COMMIT=${GIT_COMMIT}
WORKDIR /app
# The bundle contains the API and all its dependencies.
COPY --from=build /repo/apps/api/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "--enable-source-maps", "dist/server.mjs"]
