import { z } from 'zod';
import type { ApiAutopsyClient } from './apiautopsyClient.js';
import { encodeSegment, formatResult } from './apiautopsyClient.js';

type ToolResponse = {
  content: Array<{ text: string; type: 'text' }>;
};

type ToolRegistrar = {
  tool: (name: string, description: string, schema: Record<string, z.ZodTypeAny>, handler: (input: Record<string, unknown>) => Promise<ToolResponse>) => void;
};

const workspaceInput = {
  workspaceId: z.string().uuid().describe('APIAutopsy workspace id')
};

export function registerApiAutopsyTools(server: ToolRegistrar, client: ApiAutopsyClient): void {
  register(server, 'apiautopsy_health_check', 'Check whether the APIAutopsy backend is reachable.', {}, async () => {
    return client.request('/healthz', { tokenRequired: false });
  });

  register(server, 'apiautopsy_list_workspaces', 'List APIAutopsy workspaces available to the authenticated user.', {}, async () => {
    return client.request('/api/workspaces');
  });

  register(server, 'apiautopsy_list_collections', 'List collections in a workspace.', workspaceInput, async ({ workspaceId }) => {
    return client.request(`/api/workspaces/${encodeSegment(String(workspaceId))}/collections`);
  });

  register(server, 'apiautopsy_list_requests', 'List saved API requests in a workspace.', workspaceInput, async ({ workspaceId }) => {
    return client.request(`/api/workspaces/${encodeSegment(String(workspaceId))}/requests`);
  });

  register(server, 'apiautopsy_execute_request', 'Execute a saved APIAutopsy API request immediately.', {
    ...workspaceInput,
    requestId: z.string().uuid().describe('Saved API request id')
  }, async ({ requestId, workspaceId }) => {
    return client.request(`/api/workspaces/${encodeSegment(String(workspaceId))}/requests/${encodeSegment(String(requestId))}/execute`, { method: 'POST' });
  });

  register(server, 'apiautopsy_list_schedules', 'List API monitoring schedules in a workspace.', workspaceInput, async ({ workspaceId }) => {
    return client.request(`/api/workspaces/${encodeSegment(String(workspaceId))}/schedules`);
  });

  register(server, 'apiautopsy_create_schedule', 'Create an APIAutopsy schedule for a single API request or a workflow collection.', {
    ...workspaceInput,
    apiRequestId: z.string().uuid().optional().describe('Required when targetType is API_REQUEST'),
    collectionId: z.string().uuid().optional().describe('Required when targetType is COLLECTION'),
    cronExpression: z.string().optional().describe('Cron expression when scheduleType is CRON'),
    enabled: z.boolean().default(true),
    intervalMinutes: z.number().int().positive().optional().describe('Interval in minutes when scheduleType is INTERVAL'),
    name: z.string().min(1),
    publicSlug: z.string().optional().describe('Optional public status page slug'),
    publicStatusEnabled: z.boolean().default(false),
    scheduleType: z.enum(['INTERVAL', 'CRON']),
    sloLatencyP95Ms: z.number().int().positive().default(1000),
    sloUptimeTarget: z.number().min(0).max(100).default(99),
    targetType: z.enum(['API_REQUEST', 'COLLECTION'])
  }, async ({ workspaceId, ...request }) => {
    return client.request(`/api/workspaces/${encodeSegment(String(workspaceId))}/schedules`, {
      body: request,
      method: 'POST'
    });
  });

  register(server, 'apiautopsy_set_schedule_enabled', 'Enable or disable a monitoring schedule.', {
    ...workspaceInput,
    enabled: z.boolean(),
    scheduleId: z.string().uuid()
  }, async ({ enabled, scheduleId, workspaceId }) => {
    return client.request(`/api/workspaces/${encodeSegment(String(workspaceId))}/schedules/${encodeSegment(String(scheduleId))}/enabled`, {
      body: { enabled },
      method: 'PATCH'
    });
  });

  register(server, 'apiautopsy_delete_schedule', 'Delete a monitoring schedule.', {
    ...workspaceInput,
    scheduleId: z.string().uuid()
  }, async ({ scheduleId, workspaceId }) => {
    await client.request(`/api/workspaces/${encodeSegment(String(workspaceId))}/schedules/${encodeSegment(String(scheduleId))}`, { method: 'DELETE' });
    return { deleted: true, scheduleId };
  });

  register(server, 'apiautopsy_get_schedule_detail', 'Get schedule metrics and execution history.', {
    ...workspaceInput,
    scheduleId: z.string().uuid()
  }, async ({ scheduleId, workspaceId }) => {
    return client.request(`/api/workspaces/${encodeSegment(String(workspaceId))}/schedules/${encodeSegment(String(scheduleId))}/detail`);
  });

  register(server, 'apiautopsy_get_report_summary', 'Get workspace reporting summary for API executions.', workspaceInput, async ({ workspaceId }) => {
    return client.request(`/api/workspaces/${encodeSegment(String(workspaceId))}/reports/summary`);
  });

  register(server, 'apiautopsy_get_public_status', 'Read a public APIAutopsy status page by slug. This does not require a token.', {
    slug: z.string().min(3).max(80)
  }, async ({ slug }) => {
    return client.request(`/api/status/${encodeSegment(String(slug))}`, { tokenRequired: false });
  });
}

function register<Input extends Record<string, z.ZodTypeAny>, Output>(
  server: ToolRegistrar,
  name: string,
  description: string,
  schema: Input,
  handler: (input: z.infer<z.ZodObject<Input>>) => Promise<Output>
): void {
  server.tool(name, description, schema, async (input) => {
    try {
      const data = await handler(input as z.infer<z.ZodObject<Input>>);
      return textResponse(data);
    } catch (error) {
      return textResponse({ error: error instanceof Error ? error.message : 'Unknown APIAutopsy MCP error' });
    }
  });
}

function textResponse(data: unknown): ToolResponse {
  return {
    content: [
      {
        text: formatResult(data),
        type: 'text'
      }
    ]
  };
}
