#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createApiAutopsyMcpServer } from './mcpServer.js';

const server: McpServer = createApiAutopsyMcpServer(
  process.env.APIAUTOPSY_BASE_URL ?? 'https://api.apiautopsy.com',
  process.env.APIAUTOPSY_TOKEN
);

await server.connect(new StdioServerTransport());
