import { z } from 'zod';
import { MCPTool } from '../types';

/**
 * This is a local helper that generates a structured test "sprite"
 * from a description. It does NOT call the remote TestSprite API,
 * but you can adapt it later to hit their HTTP endpoint.
 *
 * When ready to use the real API, use TESTSPRITE_API_KEY env var.
 */
const generateTestSprite: MCPTool = {
  description: 'Generate a structured test case object from a natural language description',
  schema: z.object({
    description: z.string().min(1),
    priority: z.enum(['low', 'medium', 'high']).optional(),
  }),
  handler: async ({ description, priority = 'medium' }) => {
    // TODO: When ready to call the real TestSprite API, use:
    // const apiKey = process.env.TESTSPRITE_API_KEY;
    // if (!apiKey) throw new Error("TESTSPRITE_API_KEY is not set");

    return {
      title: description.slice(0, 60),
      description,
      priority,
      steps: [
        'Setup preconditions',
        'Execute the core action',
        'Verify expected result',
        'Clean up / teardown',
      ],
      expectedResult: 'System behaves according to the described scenario',
    };
  },
};

export default {
  generateTestSprite,
};
