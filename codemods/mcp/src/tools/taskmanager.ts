import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { MCPTool } from "../types";

/**
 * List processes on a Linux/WSL system by reading /proc.
 * This is intentionally lightweight: pid + cmdline.
 * 
 * TASK_MANAGER_FILE_PATH is reserved for future file-based task management.
 */
const listProcesses: MCPTool = {
  description: "List running processes (pid + command) on a Linux/WSL system",
  schema: z.object({
    limit: z.number().int().positive().max(500).optional()
  }),
  handler: async ({ limit = 100 }) => {
    const procDir = "/proc";
    const entries = await fs.readdir(procDir, { withFileTypes: true });
    const pids = entries
      .filter((e) => e.isDirectory() && /^\d+$/.test(e.name))
      .map((e) => e.name)
      .slice(0, limit);

    const result: Array<{ pid: number; cmdline: string }> = [];

    for (const pid of pids) {
      try {
        const cmdPath = path.join(procDir, pid, "cmdline");
        const content = await fs.readFile(cmdPath, "utf8");
        const cmd = content.replace(/\u0000/g, " ").trim();
        result.push({ pid: Number(pid), cmdline: cmd || "[kernel]" });
      } catch {
        // ignore processes that vanished
      }
    }

    return result;
  }
};

export default {
  listProcesses
};

