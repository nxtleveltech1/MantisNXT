import { z } from "zod";
import { Octokit } from "@octokit/rest";
import { MCPTool } from "../types";

function getOctokit() {
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (!token) {
    throw new Error("GITHUB_PERSONAL_ACCESS_TOKEN is not set in env");
  }
  return new Octokit({ auth: token });
}

const listRepos: MCPTool = {
  description: "List GitHub repositories for the authenticated user",
  schema: z.object({
    per_page: z.number().int().positive().max(100).optional(),
    page: z.number().int().positive().optional()
  }),
  handler: async ({ per_page = 30, page = 1 }) => {
    const octokit = getOctokit();
    const res = await octokit.repos.listForAuthenticatedUser({
      per_page,
      page
    });

    return res.data.map((r) => ({
      name: r.name,
      full_name: r.full_name,
      private: r.private,
      html_url: r.html_url
    }));
  }
};

const createIssue: MCPTool = {
  description: "Create an issue in a GitHub repository",
  schema: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    title: z.string().min(1),
    body: z.string().optional()
  }),
  handler: async ({ owner, repo, title, body }) => {
    const octokit = getOctokit();
    const res = await octokit.issues.create({ owner, repo, title, body });
    return {
      number: res.data.number,
      html_url: res.data.html_url
    };
  }
};

const getFile: MCPTool = {
  description: "Get text contents of a file in a GitHub repo",
  schema: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    path: z.string().min(1),
    ref: z.string().optional()
  }),
  handler: async ({ owner, repo, path, ref }) => {
    const octokit = getOctokit();
    const res = await octokit.repos.getContent({ owner, repo, path, ref });

    if (!("content" in res.data)) {
      throw new Error("Target path is not a file");
    }

    const buff = Buffer.from(
      (res.data as any).content,
      (res.data as any).encoding as BufferEncoding
    );
    return buff.toString("utf8");
  }
};

export default {
  listRepos,
  createIssue,
  getFile
};

