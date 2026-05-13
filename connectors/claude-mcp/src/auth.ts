import type { Request, Response } from 'express';

export function extractBearerToken(req: Request): string | undefined {
  const authorization = req.header('authorization');
  if (!authorization) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1];
}

export function publicOrigin(req: Request): string {
  const configured = process.env.MCP_PUBLIC_ORIGIN;
  if (configured) return normalizeOrigin(configured);
  const proto = req.header('x-forwarded-proto') ?? req.protocol;
  const host = req.header('x-forwarded-host') ?? req.header('host') ?? 'localhost';
  return normalizeOrigin(`${proto}://${host}`);
}

export function protectedResourceMetadata(req: Request) {
  const origin = publicOrigin(req);
  return {
    resource: `${origin}/mcp`,
    authorization_servers: [process.env.APIAUTOPSY_AUTH_ISSUER ?? 'https://apiautopsy.com'],
    bearer_methods_supported: ['header'],
    resource_documentation: 'https://apiautopsy.com/settings'
  };
}

export function sendMissingBearerChallenge(req: Request, res: Response): void {
  const metadataUrl = `${publicOrigin(req)}/.well-known/oauth-protected-resource`;
  res
    .status(401)
    .set('WWW-Authenticate', `Bearer resource_metadata="${metadataUrl}"`)
    .json({
      error: 'missing_token',
      error_description: 'Create an APIAutopsy integration API key and send it as Authorization: Bearer <key>.',
      resource_metadata: metadataUrl
    });
}

function normalizeOrigin(value: string): string {
  return value.replace(/\/+$/, '');
}
