# syntax=docker/dockerfile:1
# Web image: the built React app served by nginx, which forwards /api to the API.
# Build from the repository root:
#   docker build -f infra/docker/web.Dockerfile -t annecto-grid-web .

FROM node:22-alpine AS build
# Same pnpm version as "packageManager" in package.json.
RUN npm install -g pnpm@10.28.0
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm fetch
COPY . .
ARG APP_VERSION=
ARG GIT_COMMIT=unknown
ENV APP_VERSION=${APP_VERSION} GIT_COMMIT=${GIT_COMMIT}
RUN pnpm install --offline --frozen-lockfile --filter "@annecto-grid/web..." \
 && pnpm --filter @annecto-grid/web build

FROM nginxinc/nginx-unprivileged:1.28-alpine
# Address of the API as seen from this container; substituted into the nginx template at start.
ENV API_UPSTREAM=http://api:3000
COPY infra/web/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
