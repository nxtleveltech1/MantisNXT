import { z } from 'zod';
import { MCPTool } from '../types.js';

/**
 * Prepare an authenticated Dart API request payload.
 * This does NOT execute HTTP itself; it just assembles headers + body
 * so you can plug it into your own fetch/client.
 *
 * Uses DART_TOKEN from env if present.
 */
const prepareDartRequest: MCPTool = {
  description: 'Prepare an authenticated request object for a Dart API endpoint',
  schema: z.object({
    url: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('POST'),
    body: z.record(z.any()).optional(),
  }),
  handler: async ({ url, method, body }) => {
    const token = process.env.DART_TOKEN;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return {
      url,
      options: {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      },
    };
  },
};

export default {
  prepareDartRequest,
};
