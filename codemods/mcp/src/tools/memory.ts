import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { MCPTool } from "../types";

function memoryPath() {
  const p = process.env.MEMORY_FILE_PATH || "memory.json";
  return path.resolve(process.cwd(), p);
}

async function loadMemory(): Promise<Record<string, any>> {
  const p = memoryPath();
  try {
    const content = await fs.readFile(p, "utf8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function saveMemory(data: Record<string, any>) {
  const p = memoryPath();
  await fs.writeFile(p, JSON.stringify(data, null, 2), "utf8");
}

const memSet: MCPTool = {
  description: "Set a key in a local JSON memory store",
  schema: z.object({
    key: z.string().min(1),
    value: z.any()
  }),
  handler: async ({ key, value }) => {
    const mem = await loadMemory();
    mem[key] = value;
    await saveMemory(mem);
    return "OK";
  }
};

const memGet: MCPTool = {
  description: "Get a key from the local JSON memory store",
  schema: z.object({
    key: z.string().min(1)
  }),
  handler: async ({ key }) => {
    const mem = await loadMemory();
    return mem[key] ?? null;
  }
};

const memAll: MCPTool = {
  description: "Dump the entire local JSON memory store",
  schema: z.object({}),
  handler: async () => {
    return await loadMemory();
  }
};

export default {
  memSet,
  memGet,
  memAll
};

