import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiAutopsyClient } from './apiautopsyClient.js';
import { registerApiAutopsyTools } from './tools.js';

export function createApiAutopsyMcpServer(baseUrl: string, token?: string): McpServer {
  const server = new McpServer({
    name: 'apiautopsy',
    version: '0.1.0',
    websiteUrl: 'https://apiautopsy.com'
  });

  registerApiAutopsyTools(server, new ApiAutopsyClient(baseUrl, token));
  return server;
}
