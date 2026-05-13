#!/usr/bin/env node
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { createApiAutopsyMcpServer } from './mcpServer.js';

const baseUrl = process.env.APIAUTOPSY_BASE_URL ?? 'https://api.apiautopsy.com';
const host = process.env.HOST ?? '0.0.0.0';
const port = Number(process.env.PORT ?? 3000);
const allowedHosts = parseCsv(process.env.MCP_ALLOWED_HOSTS);
const staticToken = process.env.APIAUTOPSY_TOKEN;

const app = createMcpExpressApp({
  allowedHosts: allowedHosts.length ? allowedHosts : undefined,
  host
});

app.get('/healthz', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'apiautopsy-mcp' });
});

app.post('/mcp', async (req: Request, res: Response) => {
  const token = extractBearerToken(req) ?? staticToken;
  const server = createApiAutopsyMcpServer(baseUrl, token);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
  } catch (error) {
    console.error('APIAutopsy MCP request failed', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          code: -32603,
          message: 'Internal server error'
        },
        id: null,
        jsonrpc: '2.0'
      });
    }
  }
});

app.get('/mcp', (_req: Request, res: Response) => {
  res.status(405).json({
    error: {
      code: -32000,
      message: 'Use POST /mcp for stateless Streamable HTTP MCP requests.'
    },
    id: null,
    jsonrpc: '2.0'
  });
});

app.delete('/mcp', (_req: Request, res: Response) => {
  res.status(405).json({
    error: {
      code: -32000,
      message: 'Method not allowed.'
    },
    id: null,
    jsonrpc: '2.0'
  });
});

app.listen(port, host, (error?: Error) => {
  if (error) {
    console.error('Failed to start APIAutopsy MCP server', error);
    process.exit(1);
  }
  console.log(`APIAutopsy MCP remote server listening on http://${host}:${port}/mcp`);
});

function extractBearerToken(req: Request): string | undefined {
  const authorization = req.header('authorization');
  if (!authorization) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1];
}

function parseCsv(value?: string): string[] {
  return value?.split(',').map((entry) => entry.trim()).filter(Boolean) ?? [];
}
