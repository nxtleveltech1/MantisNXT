import { ToolMap, runToolHandler } from "./types.js";
import fsTools from "./tools/filesystem.js";
import githubTools from "./tools/github.js";
import neonTools from "./tools/neon.js";
import memoryTools from "./tools/memory.js";
import sequentialTools from "./tools/sequential.js";
import chromeTools from "./tools/chrome.js";
import testspriteTools from "./tools/testsprite.js";
import taskmanagerTools from "./tools/taskmanager.js";
import context7Tools from "./tools/context7.js";
import dartTools from "./tools/dart.js";

const tools: ToolMap = {
  ...fsTools,
  ...githubTools,
  ...neonTools,
  ...memoryTools,
  ...sequentialTools,
  ...chromeTools,
  ...testspriteTools,
  ...taskmanagerTools,
  ...context7Tools,
  ...dartTools
};

type JsonRpcRequest = {
  id?: string | number | null;
  method: string;
  params?: any;
};

type JsonRpcResponse = {
  id?: string | number | null;
  result?: any;
  error?: { message: string };
};

async function handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse> {
  if (!req || typeof req.method !== "string") {
    return { id: req?.id, error: { message: "Invalid request" } };
  }

  if (req.method === "tools/list") {
    const list = Object.entries(tools).map(([name, tool]) => ({
      name,
      description: tool.description
    }));
    return { id: req.id, result: list };
  }

  if (req.method === "tools/call") {
    const { name, args } = req.params ?? {};
    if (!name || typeof name !== "string") {
      return { id: req.id, error: { message: "Missing tool name" } };
    }
    const tool = tools[name];
    if (!tool) {
      return { id: req.id, error: { message: `Unknown tool '${name}'` } };
    }

    const res = await runToolHandler(tool, args);
    return { id: req.id, result: res };
  }

  return { id: req.id, error: { message: `Unknown method '${req.method}'` } };
}

async function main() {
  process.stdin.setEncoding("utf8");
  let buffer = "";

  process.stdin.on("data", async (chunk) => {
    buffer += chunk;

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
      const raw = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!raw) continue;

      let request: JsonRpcRequest;
      try {
        request = JSON.parse(raw);
      } catch (err: any) {
        const resp: JsonRpcResponse = {
          error: { message: "Invalid JSON: " + (err?.message || String(err)) }
        };
        process.stdout.write(JSON.stringify(resp) + "\n");
        continue;
      }

      try {
        const resp = await handleRequest(request);
        process.stdout.write(JSON.stringify(resp) + "\n");
      } catch (err: any) {
        const resp: JsonRpcResponse = {
          id: request.id,
          error: { message: err?.message || String(err) }
        };
        process.stdout.write(JSON.stringify(resp) + "\n");
      }
    }
  });
}

main().catch((err) => {
  console.error("Fatal MCP server error:", err);
  process.exit(1);
});

