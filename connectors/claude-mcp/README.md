# APIAutopsy Claude MCP Connector

This connector lets Claude use APIAutopsy as a tool provider through MCP.

## Tools

- `apiautopsy_health_check`
- `apiautopsy_list_workspaces`
- `apiautopsy_list_collections`
- `apiautopsy_list_requests`
- `apiautopsy_execute_request`
- `apiautopsy_list_schedules`
- `apiautopsy_create_schedule`
- `apiautopsy_set_schedule_enabled`
- `apiautopsy_delete_schedule`
- `apiautopsy_get_schedule_detail`
- `apiautopsy_get_report_summary`
- `apiautopsy_get_public_status`

## Setup

```bash
cd connectors/claude-mcp
npm install
npm run build
```

Create an integration API key from APIAutopsy Settings > Integration API keys, or use a JWT for local testing.

```bash
export APIAUTOPSY_BASE_URL="https://api.apiautopsy.com"
export APIAUTOPSY_TOKEN="your-token"
```

## Claude Desktop Config

Add this to your Claude Desktop MCP config:

```json
{
  "mcpServers": {
    "apiautopsy": {
      "command": "node",
      "args": ["/absolute/path/to/apiautopsy/connectors/claude-mcp/dist/index.js"],
      "env": {
        "APIAUTOPSY_BASE_URL": "https://api.apiautopsy.com",
        "APIAUTOPSY_TOKEN": "your-token"
      }
    }
  }
}
```

For local development:

```json
{
  "mcpServers": {
    "apiautopsy-local": {
      "command": "node",
      "args": ["/Users/mshussain/Documents/New project 2/connectors/claude-mcp/dist/index.js"],
      "env": {
        "APIAUTOPSY_BASE_URL": "http://127.0.0.1:8080",
        "APIAUTOPSY_TOKEN": "local-jwt-token"
      }
    }
  }
}
```

## Hosted Remote MCP For Claude Connectors

For all Claude users, deploy the remote server and add its public HTTPS MCP endpoint in Claude:

```bash
cd connectors/claude-mcp
npm install
npm run build
APIAUTOPSY_BASE_URL="https://api.apiautopsy.com" \
APIAUTOPSY_AUTH_ISSUER="https://apiautopsy.com" \
MCP_PUBLIC_ORIGIN="https://mcp.apiautopsy.com" \
MCP_ALLOWED_HOSTS="mcp.apiautopsy.com" \
PORT=3000 \
npm run start:remote
```

Expose:

```text
https://mcp.apiautopsy.com/mcp
```

The hosted server supports stateless Streamable HTTP MCP. It accepts an `Authorization: Bearer <token>` header and forwards that token to APIAutopsy so backend workspace isolation remains the source of truth.
If a client calls `/mcp` without a token, the server returns a `401` Bearer challenge and exposes protected resource metadata at:

```text
https://mcp.apiautopsy.com/.well-known/oauth-protected-resource
```

For public usage in Claude, issue an APIAutopsy integration key:

1. Sign in to APIAutopsy.
2. Open Settings > Integration API keys.
3. Create a key named `Claude MCP Connector`.
4. Use it as `Authorization: Bearer <integration-api-key>` against `https://mcp.apiautopsy.com/mcp`.

OAuth can be layered on later for a one-click Claude install flow, but API keys already keep workspace isolation and user ownership enforced by APIAutopsy.

## OAuth Authorization-Code Flow

APIAutopsy also exposes the production OAuth endpoints needed for connector onboarding:

```text
GET  https://apiautopsy.com/oauth/authorize?response_type=code&client_id=claude-mcp&redirect_uri=...&scope=workspaces:read%20requests:read%20requests:execute%20schedules:read%20reports:read%20status:read&state=...&code_challenge=...&code_challenge_method=S256
POST https://api.apiautopsy.com/api/oauth/token
```

Token exchange uses `application/x-www-form-urlencoded`:

```text
grant_type=authorization_code
client_id=claude-mcp
code=<returned-code>
redirect_uri=<same-redirect-uri>
code_verifier=<pkce-verifier>
```

The response is a scoped bearer token:

```json
{
  "access_token": "aao_live_...",
  "token_type": "Bearer",
  "expires_in": 43200,
  "scope": "workspaces:read requests:read requests:execute schedules:read reports:read status:read"
}
```

## Security

- The connector never stores tokens.
- Local tokens are read only from environment variables.
- Hosted requests can use bearer tokens supplied by the MCP client.
- APIAutopsy integration keys are stored hashed, can be revoked, and are shown only once at creation.
- Public status lookup does not require a token.
- API calls are scoped by APIAutopsy backend authorization and workspace isolation.
