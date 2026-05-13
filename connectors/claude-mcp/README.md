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

Create a user token from APIAutopsy, or use a JWT for local testing.

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
MCP_ALLOWED_HOSTS="mcp.apiautopsy.com" \
PORT=3000 \
npm run start:remote
```

Expose:

```text
https://mcp.apiautopsy.com/mcp
```

The hosted server supports stateless Streamable HTTP MCP. It accepts an `Authorization: Bearer <token>` header and forwards that token to APIAutopsy so backend workspace isolation remains the source of truth.

For true public usage in Claude, the next production requirement is OAuth/API-key issuance from APIAutopsy:

1. Users click “Add connector” in Claude.
2. Claude opens APIAutopsy OAuth/login.
3. APIAutopsy returns an access token scoped to that user.
4. Claude sends that token to `https://mcp.apiautopsy.com/mcp`.

Until OAuth is added, this remote server can be tested with manually supplied bearer tokens or with a server-side `APIAUTOPSY_TOKEN` for an internal/shared account.

## Security

- The connector never stores tokens.
- Local tokens are read only from environment variables.
- Hosted requests can use bearer tokens supplied by the MCP client.
- Public status lookup does not require a token.
- API calls are scoped by APIAutopsy backend authorization and workspace isolation.
