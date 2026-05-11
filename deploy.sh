#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-climamonitor-demo-rg}"
STATIC_WEB_APP_NAME="${STATIC_WEB_APP_NAME:-climamonitor-frontend}"
STATIC_WEB_APP_LOCATION="${STATIC_WEB_APP_LOCATION:-westeurope}"
FRONTEND_APP_ID="${FRONTEND_APP_ID:-b9e2407d-43db-4150-85e9-4d159c618578}"
API_FUNCTION_APP_NAME="${API_FUNCTION_APP_NAME:-climamonitor-api}"
LOCAL_REDIRECT_URI="${LOCAL_REDIRECT_URI:-http://localhost:5173}"

cd "$(dirname "$0")"

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI is required." >&2
  exit 1
fi

if ! az account show >/dev/null 2>&1; then
  echo "Run az login before deploying." >&2
  exit 1
fi

if [ ! -f ".env.azure.local" ] && [ ! -f ".env" ]; then
  cat >&2 <<'MESSAGE'
Create .env.azure.local or .env with the Azure MSAL build values before deploying:
  VITE_AUTH_MODE=optional
  VITE_AZURE_TENANT_ID=...
  VITE_AZURE_CLIENT_ID=...
  VITE_AZURE_AUTHORITY=...
  VITE_AZURE_API_SCOPE=...
MESSAGE
  exit 1
fi

npm ci
npm test
npm run build:azure

if ! az staticwebapp show \
  --name "$STATIC_WEB_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  az staticwebapp create \
    --name "$STATIC_WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$STATIC_WEB_APP_LOCATION" \
    --sku Free
fi

DEFAULT_HOSTNAME="$(az staticwebapp show \
  --name "$STATIC_WEB_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "defaultHostname" \
  -o tsv)"

PUBLIC_URL="https://${DEFAULT_HOSTNAME}"

az functionapp cors add \
  --name "$API_FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --allowed-origins "$PUBLIC_URL" >/dev/null

az rest \
  --method PATCH \
  --url "https://graph.microsoft.com/v1.0/applications(appId='$FRONTEND_APP_ID')" \
  --headers "Content-Type=application/json" \
  --body "{\"spa\":{\"redirectUris\":[\"$LOCAL_REDIRECT_URI\",\"$PUBLIC_URL\"]}}" >/dev/null

DEPLOYMENT_TOKEN="$(az staticwebapp secrets list \
  --name "$STATIC_WEB_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.apiKey" \
  -o tsv)"

npx -y @azure/static-web-apps-cli@2.0.6 deploy ./dist \
  --env production \
  --deployment-token "$DEPLOYMENT_TOKEN"

echo "Frontend live at: $PUBLIC_URL"
