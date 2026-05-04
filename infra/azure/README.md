# Azure Backend Deployment

This deploys APIAutopsy backend to Azure Container Apps on the Consumption plan.

## Why Container Apps

Azure Container Apps has a monthly free grant on the Consumption plan and supports scale to zero. It is a better fit for this Spring Boot Docker backend than App Service Free.

## One-Time Azure Setup

Run these commands in Azure Cloud Shell or a local terminal with Azure CLI installed.

```bash
az login
az extension add --name containerapp --upgrade

az group create \
  --name apiautopsy-rg \
  --location eastus

az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights

az containerapp env create \
  --name apiautopsy-env \
  --resource-group apiautopsy-rg \
  --location eastus
```

Create the backend app with the public GHCR image:

```bash
az containerapp create \
  --name apiautopsy-backend \
  --resource-group apiautopsy-rg \
  --environment apiautopsy-env \
  --image ghcr.io/hussaincode/apiautopsy-backend:latest \
  --target-port 8080 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 1 \
  --cpu 0.5 \
  --memory 1Gi \
  --env-vars \
    PORT=8080 \
    SPRING_DATASOURCE_URL="jdbc:postgresql://ep-weathered-tree-an39mw9n-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require" \
    SPRING_DATASOURCE_USERNAME="neondb_owner" \
    SPRING_DATASOURCE_PASSWORD="<neon-password>" \
    JWT_SECRET="<long-random-secret-at-least-32-chars>" \
    CRYPTO_SECRET="<another-long-random-secret-at-least-32-chars>" \
    GOOGLE_CLIENT_ID="427475119013-u0i4id35g2926pd2gunpueajqvs4d155.apps.googleusercontent.com" \
    GOOGLE_CLIENT_SECRET="<google-client-secret>" \
    CORS_ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,https://apiautopsy.com,https://www.apiautopsy.com"
```

Get the backend URL:

```bash
az containerapp show \
  --name apiautopsy-backend \
  --resource-group apiautopsy-rg \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

Test health:

```bash
curl -i "https://<backend-fqdn>/healthz"
```

## GitHub Secrets for CI/CD

Create an Azure service principal:

```bash
SUBSCRIPTION_ID="$(az account show --query id -o tsv)"

az ad sp create-for-rbac \
  --name apiautopsy-github-deploy \
  --role contributor \
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/apiautopsy-rg" \
  --sdk-auth
```

Add the JSON output as a GitHub repository secret:

```text
AZURE_CREDENTIALS
```

Add these repository secrets too:

```text
AZURE_RESOURCE_GROUP=apiautopsy-rg
AZURE_CONTAINER_APP_NAME=apiautopsy-backend
```

The workflow at `.github/workflows/deploy-backend-azure.yml` will build the backend Docker image, push it to GitHub Container Registry, and update Azure Container Apps on every push to `main`.

## Vercel Frontend Env

Set this in Vercel after Azure backend is live:

```text
VITE_API_URL=https://<backend-fqdn>
```

## Domain

For `api.apiautopsy.com`, add a CNAME in GoDaddy pointing to the Azure Container Apps FQDN. Then add the custom domain and certificate inside Azure Container Apps.
