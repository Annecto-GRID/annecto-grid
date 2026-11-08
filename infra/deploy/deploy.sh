#!/usr/bin/env bash
# Deploys one environment on the server. Run by GitHub Actions as the user "deploy":
#   bash /srv/grid/deploy/deploy.sh <test|prod> <commit sha> <registry> <domain> <acme email>
# The images must already be in the registry, and Docker must be logged in to it.
set -euo pipefail

ENV_NAME=${1:-}
SHA=${2:-}
REGISTRY=${3:-}
DOMAIN=${4:-}
EMAIL=${5:-}

fail() { echo "deploy: $*" >&2; exit 1; }
[[ "$ENV_NAME" =~ ^(test|prod)$ ]] || fail "environment must be test or prod, got '$ENV_NAME'"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || fail "commit must be a full 40-character sha"
[[ "$REGISTRY" =~ ^ghcr\.io/[a-z0-9._/-]+$ ]] || fail "unexpected registry '$REGISTRY'"
[[ "$DOMAIN" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]] || fail "invalid domain '$DOMAIN'"
[[ "$EMAIL" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]] || fail "invalid e-mail address"

BASE=/srv/grid
cd "$BASE/deploy"

echo "==> Caddy (HTTPS for test.$DOMAIN and app.$DOMAIN)"
printf 'APP_DOMAIN=%s\nACME_EMAIL=%s\n' "$DOMAIN" "$EMAIL" >"$BASE/edge/.env"
docker compose -p grid-edge -f edge.compose.yml --env-file "$BASE/edge/.env" up -d --remove-orphans
# The Caddyfile is mounted from disk; reload it in case it changed.
docker compose -p grid-edge -f edge.compose.yml --env-file "$BASE/edge/.env" exec -T caddy \
  caddy reload --config /etc/caddy/Caddyfile >/dev/null

echo "==> $ENV_NAME: $SHA"
printf 'REGISTRY=%s\nIMAGE_TAG=%s\nGRID_ENV=%s\n' "$REGISTRY" "$SHA" "$ENV_NAME" >"$BASE/$ENV_NAME/.env"
compose=(docker compose -p "grid-$ENV_NAME" -f app.compose.yml --env-file "$BASE/$ENV_NAME/.env")
"${compose[@]}" pull --quiet
"${compose[@]}" up -d --remove-orphans --wait --wait-timeout 120

# Keep a record of what runs where, and remove images that are no longer used.
printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SHA" >>"$BASE/$ENV_NAME/deployments.log"
docker image prune -f >/dev/null
echo "==> $ENV_NAME is running $SHA"
