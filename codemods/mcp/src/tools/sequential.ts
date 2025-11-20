import { z } from "zod";
import { MCPTool } from "../types";

const planSteps: MCPTool = {
  description: "Break a goal into a sequence of steps",
  schema: z.object({
    goal: z.string().min(1),
    maxSteps: z.number().int().positive().max(20).optional()
  }),
  handler: async ({ goal, maxSteps = 7 }) => {
    const steps: string[] = [];
    steps.push(`Clarify the goal: "${goal}".`);
    steps.push("Gather context, constraints, and existing work.");
    steps.push("List possible approaches and pick a primary one.");
    steps.push("Break the chosen approach into concrete, small actions.");
    steps.push("Order actions by dependency and impact.");
    steps.push("Execute actions while checking intermediate results.");
    steps.push("Review the outcome, note lessons, and iterate if needed.");
    return steps.slice(0, maxSteps);
  }
};

export default {
  planSteps
};

