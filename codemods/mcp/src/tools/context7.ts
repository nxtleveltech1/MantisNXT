import { z } from 'zod';
import { MCPTool } from '../types';

/**
 * A simple local "context" helper that ranks documents by keyword frequency.
 * This is not a vector search, but it approximates "relevant context selection".
 */
const contextFilter: MCPTool = {
  description: 'Given docs and a query, return docs ranked by simple keyword relevance',
  schema: z.object({
    query: z.string().min(1),
    docs: z.array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1),
      })
    ),
  }),
  handler: async ({ query, docs }) => {
    const q = query.toLowerCase().split(/\s+/).filter(Boolean);

    function score(text: string) {
      const t = text.toLowerCase();
      let s = 0;
      for (const token of q) {
        const count = t.split(token).length - 1;
        s += count;
      }
      return s;
    }

    const scored = docs
      .map(d => ({ ...d, score: score(d.text) }))
      .filter(d => d.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored;
  },
};

export default {
  contextFilter,
};
