#!/usr/bin/env bash
# Configures the Keycloak realm for the UI's direct sign-in (api/oidc.js):
#   - public client $CLIENT_ID, no client secret: direct access grants for the
#     in-app login form, authorization code + PKCE for self-registration
#   - DX realm roles: consumer, provider, cos_admin, org_admin, compute,
#     application_provider, infra_provider
#   - consumer as a default role, so self-registered users get it
#   - self-registration enabled
#
# Idempotent: re-running updates the client and skips what already exists.
#
# Usage (Keycloak must be running):
#   KEYCLOAK_ADMIN_USER=admin KEYCLOAK_ADMIN_PASSWORD=... \
#   UI_ORIGIN=http://localhost:5174 ./scripts/setup-keycloak-ui-client.sh
set -euo pipefail

KCADM="${KCADM:-kcadm.sh}"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
REALM="${REALM:-master}"
CLIENT_ID="${CLIENT_ID:-p3dx-auth-ui}"
UI_ORIGIN="${UI_ORIGIN:-http://localhost:5174}"
: "${KEYCLOAK_ADMIN_USER:?set KEYCLOAK_ADMIN_USER}"
: "${KEYCLOAK_ADMIN_PASSWORD:?set KEYCLOAK_ADMIN_PASSWORD}"

"$KCADM" config credentials --server "$KEYCLOAK_URL" --realm master \
  --user "$KEYCLOAK_ADMIN_USER" --password "$KEYCLOAK_ADMIN_PASSWORD"

client_json=$(cat <<EOF
{
  "clientId": "$CLIENT_ID",
  "enabled": true,
  "publicClient": true,
  "standardFlowEnabled": true,
  "directAccessGrantsEnabled": true,
  "implicitFlowEnabled": false,
  "redirectUris": ["$UI_ORIGIN/auth/callback"],
  "webOrigins": ["$UI_ORIGIN"],
  "attributes": {
    "pkce.code.challenge.method": "S256",
    "post.logout.redirect.uris": "$UI_ORIGIN/login"
  }
}
EOF
)

existing=$("$KCADM" get clients -r "$REALM" -q clientId="$CLIENT_ID" --fields id --format csv --noquotes)
if [ -n "$existing" ]; then
  echo "$client_json" | "$KCADM" update "clients/$existing" -r "$REALM" -f -
  echo "Updated client $CLIENT_ID"
else
  echo "$client_json" | "$KCADM" create clients -r "$REALM" -f -
  echo "Created client $CLIENT_ID"
fi

for role in consumer provider cos_admin org_admin compute application_provider infra_provider; do
  if "$KCADM" get "roles/$role" -r "$REALM" >/dev/null 2>&1; then
    echo "Role $role exists"
  else
    "$KCADM" create roles -r "$REALM" -s name="$role"
    echo "Created role $role"
  fi
done

"$KCADM" add-roles -r "$REALM" --rname "default-roles-$REALM" --rolename consumer
"$KCADM" update "realms/$REALM" -s registrationAllowed=true

echo "Done: realm $REALM ready for $UI_ORIGIN"
