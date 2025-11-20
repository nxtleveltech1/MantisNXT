import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { MCPTool } from "../types";

async function safeResolve(target: string) {
  return path.resolve(process.cwd(), target);
}

const readFile: MCPTool = {
  description: "Read a UTF-8 text file from disk",
  schema: z.object({
    path: z.string().min(1)
  }),
  handler: async ({ path }) => {
    const resolved = await safeResolve(path);
    return await fs.readFile(resolved, "utf8");
  }
};

const writeFile: MCPTool = {
  description: "Write (overwrite) a UTF-8 text file",
  schema: z.object({
    path: z.string().min(1),
    content: z.string()
  }),
  handler: async ({ path, content }) => {
    const resolved = await safeResolve(path);
    await fs.writeFile(resolved, content, "utf8");
    return "OK";
  }
};

const appendFile: MCPTool = {
  description: "Append text to a file",
  schema: z.object({
    path: z.string().min(1),
    content: z.string()
  }),
  handler: async ({ path, content }) => {
    const resolved = await safeResolve(path);
    await fs.appendFile(resolved, content, "utf8");
    return "OK";
  }
};

const listDir: MCPTool = {
  description: "List directory contents (files + directories)",
  schema: z.object({
    path: z.string().min(1)
  }),
  handler: async ({ path }) => {
    const resolved = await safeResolve(path);
    const entries = await fs.readdir(resolved, { withFileTypes: true });
    return entries.map((e) => ({
      name: e.name,
      type: e.isDirectory() ? "dir" : "file"
    }));
  }
};

const statPath: MCPTool = {
  description: "Get file/directory metadata",
  schema: z.object({
    path: z.string().min(1)
  }),
  handler: async ({ path }) => {
    const resolved = await safeResolve(path);
    const s = await fs.stat(resolved);
    return {
      size: s.size,
      isFile: s.isFile(),
      isDirectory: s.isDirectory(),
      mtime: s.mtime.toISOString(),
      ctime: s.ctime.toISOString()
    };
  }
};

export default {
  readFile,
  writeFile,
  appendFile,
  listDir,
  statPath
};

