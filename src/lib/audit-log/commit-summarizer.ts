/**
 * AI-Powered Git Commit Summarizer
 * 
 * Analyzes git diffs and generates meaningful summaries using the project's
 * AI infrastructure. Caches results to avoid repeated API calls.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getProviderClient, getProviderClientsForFallback } from '@/lib/ai/providers';

const execAsync = promisify(exec);

// Workspace paths
const WORKSPACE_PATHS = {
  MantisNXT: 'E:\\00Project\\MantisNXT',
  NXT_OCR: 'E:\\00Project\\NXT_OCR',
} as const;

type WorkspaceName = keyof typeof WORKSPACE_PATHS;

// Cache file path
const CACHE_FILE_PATH = path.join(process.cwd(), 'data', 'audit-log-cache.json');

export interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string; // Original message (e.g., "14.2")
  author: string;
  date: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
  files: string[];
  workspace: WorkspaceName;
}

export interface CommitSummary extends CommitInfo {
  aiSummary: string;
  generatedAt: string;
}

interface CacheEntry {
  aiSummary: string;
  generatedAt: string;
  filesChanged: number;
}

interface CacheData {
  [commitHash: string]: CacheEntry;
}

/**
 * Load the cache from disk
 */
async function loadCache(): Promise<CacheData> {
  try {
    const data = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

/**
 * Save the cache to disk
 */
async function saveCache(cache: CacheData): Promise<void> {
  try {
    // Ensure directory exists
    const dir = path.dirname(CACHE_FILE_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save audit log cache:', error);
  }
}

/**
 * Parse git log output into CommitInfo objects
 */
function parseGitLog(output: string, workspace: WorkspaceName): CommitInfo[] {
  const commits: CommitInfo[] = [];
  const commitBlocks = output.split('\n\ncommit ').filter(Boolean);

  for (const block of commitBlocks) {
    try {
      const lines = block.split('\n');
      const firstLine = lines[0].startsWith('commit ') ? lines[0].substring(7) : lines[0];
      const hash = firstLine.trim();
      
      if (!hash || hash.length < 7) continue;

      let author = '';
      let date = '';
      let message = '';
      let filesChanged = 0;
      let insertions = 0;
      let deletions = 0;
      const files: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('Author:')) {
          author = line.substring(7).trim().split('<')[0].trim();
        } else if (line.startsWith('Date:')) {
          date = line.substring(5).trim();
        } else if (line.startsWith('    ') && !message) {
          message = line.trim();
        } else if (line.includes('|')) {
          // File change line: " src/file.ts | 10 ++-"
          const filePath = line.split('|')[0].trim();
          if (filePath) files.push(filePath);
        } else if (line.includes('file') && line.includes('changed')) {
          // Summary line: " 3 files changed, 45 insertions(+), 12 deletions(-)"
          const match = line.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);
          if (match) {
            filesChanged = parseInt(match[1]) || 0;
            insertions = parseInt(match[2]) || 0;
            deletions = parseInt(match[3]) || 0;
          }
        }
      }

      if (hash && date) {
        commits.push({
          hash,
          shortHash: hash.substring(0, 7),
          message: message || 'No message',
          author,
          date,
          filesChanged,
          insertions,
          deletions,
          files,
          workspace,
        });
      }
    } catch (error) {
      console.error('Error parsing commit block:', error);
    }
  }

  return commits;
}

/**
 * Get git log for a workspace
 */
async function getGitLog(
  workspace: WorkspaceName,
  since?: string,
  until?: string
): Promise<CommitInfo[]> {
  const workspacePath = WORKSPACE_PATHS[workspace];
  
  let dateArgs = '';
  if (since) dateArgs += ` --since="${since}"`;
  if (until) dateArgs += ` --until="${until}"`;

  try {
    const { stdout } = await execAsync(
      `git log --stat --date=iso${dateArgs}`,
      { 
        cwd: workspacePath,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }
    );
    return parseGitLog(stdout, workspace);
  } catch (error) {
    console.error(`Failed to get git log for ${workspace}:`, error);
    return [];
  }
}

/**
 * Get the diff summary for a specific commit
 */
async function getCommitDiffSummary(
  workspace: WorkspaceName,
  hash: string
): Promise<string> {
  const workspacePath = WORKSPACE_PATHS[workspace];

  try {
    // Get file-level changes with stats
    const { stdout } = await execAsync(
      `git show --stat --name-status ${hash}`,
      { 
        cwd: workspacePath,
        maxBuffer: 5 * 1024 * 1024,
      }
    );
    return stdout;
  } catch (error) {
    console.error(`Failed to get diff for ${hash}:`, error);
    return '';
  }
}

/**
 * Categorize files by type
 */
function categorizeFiles(files: string[]): Record<string, string[]> {
  const categories: Record<string, string[]> = {
    components: [],
    api: [],
    lib: [],
    styles: [],
    config: [],
    tests: [],
    docs: [],
    database: [],
    other: [],
  };

  for (const file of files) {
    const lower = file.toLowerCase();
    if (lower.includes('/components/') || lower.endsWith('.tsx')) {
      categories.components.push(file);
    } else if (lower.includes('/api/') || lower.includes('route.ts')) {
      categories.api.push(file);
    } else if (lower.includes('/lib/') || lower.includes('/services/') || lower.includes('/utils/')) {
      categories.lib.push(file);
    } else if (lower.endsWith('.css') || lower.includes('styles') || lower.includes('tailwind')) {
      categories.styles.push(file);
    } else if (lower.includes('config') || lower.endsWith('.json') || lower.endsWith('.env')) {
      categories.config.push(file);
    } else if (lower.includes('test') || lower.includes('spec')) {
      categories.tests.push(file);
    } else if (lower.endsWith('.md') || lower.includes('docs')) {
      categories.docs.push(file);
    } else if (lower.includes('database') || lower.includes('migration') || lower.endsWith('.sql')) {
      categories.database.push(file);
    } else {
      categories.other.push(file);
    }
  }

  return categories;
}

/**
 * Generate AI summary for a commit
 */
async function generateAISummary(
  commit: CommitInfo,
  diffSummary: string
): Promise<string> {
  const categories = categorizeFiles(commit.files);
  
  // Build a concise context for the AI
  const categoryDescriptions: string[] = [];
  if (categories.components.length > 0) {
    categoryDescriptions.push(`${categories.components.length} React component(s)`);
  }
  if (categories.api.length > 0) {
    categoryDescriptions.push(`${categories.api.length} API route(s)`);
  }
  if (categories.lib.length > 0) {
    categoryDescriptions.push(`${categories.lib.length} library/utility file(s)`);
  }
  if (categories.styles.length > 0) {
    categoryDescriptions.push(`${categories.styles.length} style file(s)`);
  }
  if (categories.config.length > 0) {
    categoryDescriptions.push(`${categories.config.length} config file(s)`);
  }
  if (categories.database.length > 0) {
    categoryDescriptions.push(`${categories.database.length} database file(s)`);
  }
  if (categories.tests.length > 0) {
    categoryDescriptions.push(`${categories.tests.length} test file(s)`);
  }
  if (categories.docs.length > 0) {
    categoryDescriptions.push(`${categories.docs.length} documentation file(s)`);
  }

  const filesList = commit.files.slice(0, 15).join(', ');
  const hasMore = commit.files.length > 15 ? ` and ${commit.files.length - 15} more` : '';

  const prompt = `Summarize this code change in 1-2 concise sentences. Focus on what was built, updated, or fixed. Be specific but brief.

Workspace: ${commit.workspace}
Version/Commit: ${commit.message}
Files changed: ${commit.filesChanged} (${commit.insertions} additions, ${commit.deletions} deletions)
File types: ${categoryDescriptions.join(', ') || 'various files'}
Files: ${filesList}${hasMore}

Diff summary:
${diffSummary.substring(0, 2000)}

Generate a professional summary (1-2 sentences, no bullet points):`;

  try {
    // Try to get an AI client
    const clients = getProviderClientsForFallback();
    
    if (clients.length === 0) {
      // No AI available, generate heuristic summary
      return generateHeuristicSummary(commit, categories);
    }

    for (const client of clients) {
      try {
        const result = await client.generateText(prompt, {
          maxTokens: 150,
          temperature: 0.3,
        });
        
        if (result.text) {
          return result.text.trim();
        }
      } catch (error) {
        console.warn(`AI provider ${client.id} failed, trying next...`);
        continue;
      }
    }

    // All providers failed, use heuristic
    return generateHeuristicSummary(commit, categories);
  } catch (error) {
    console.error('AI summarization failed:', error);
    return generateHeuristicSummary(commit, categories);
  }
}

/**
 * Generate a heuristic-based summary when AI is unavailable
 */
function generateHeuristicSummary(
  commit: CommitInfo,
  categories: Record<string, string[]>
): string {
  const parts: string[] = [];

  if (categories.components.length > 0) {
    const componentNames = categories.components
      .slice(0, 3)
      .map(f => f.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, ''))
      .filter(Boolean);
    parts.push(`Updated ${categories.components.length} component${categories.components.length > 1 ? 's' : ''} (${componentNames.join(', ')})`);
  }

  if (categories.api.length > 0) {
    parts.push(`Modified ${categories.api.length} API route${categories.api.length > 1 ? 's' : ''}`);
  }

  if (categories.lib.length > 0) {
    parts.push(`Changed ${categories.lib.length} utility/service file${categories.lib.length > 1 ? 's' : ''}`);
  }

  if (categories.database.length > 0) {
    parts.push(`Updated database schema/migrations`);
  }

  if (categories.config.length > 0) {
    parts.push(`Modified configuration`);
  }

  if (parts.length === 0) {
    parts.push(`Changed ${commit.filesChanged} file${commit.filesChanged > 1 ? 's' : ''}`);
  }

  return parts.slice(0, 2).join('. ') + '.';
}

/**
 * Get commits with AI summaries for a date range
 */
export async function getCommitsWithSummaries(
  fromDate?: string,
  toDate?: string
): Promise<CommitSummary[]> {
  // Default to last 14 days if no dates provided
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 14);
  
  const since = fromDate || defaultFrom.toISOString().split('T')[0];
  const until = toDate || new Date().toISOString().split('T')[0];

  // Load existing cache
  const cache = await loadCache();

  // Get commits from both workspaces
  const [mantisCommits, ocrCommits] = await Promise.all([
    getGitLog('MantisNXT', since, until),
    getGitLog('NXT_OCR', since, until),
  ]);

  const allCommits = [...mantisCommits, ...ocrCommits];
  const summaries: CommitSummary[] = [];
  let cacheUpdated = false;

  for (const commit of allCommits) {
    // Check cache first
    if (cache[commit.hash]) {
      summaries.push({
        ...commit,
        aiSummary: cache[commit.hash].aiSummary,
        generatedAt: cache[commit.hash].generatedAt,
      });
      continue;
    }

    // Generate new summary
    const diffSummary = await getCommitDiffSummary(commit.workspace, commit.hash);
    const aiSummary = await generateAISummary(commit, diffSummary);
    const generatedAt = new Date().toISOString();

    // Update cache
    cache[commit.hash] = {
      aiSummary,
      generatedAt,
      filesChanged: commit.filesChanged,
    };
    cacheUpdated = true;

    summaries.push({
      ...commit,
      aiSummary,
      generatedAt,
    });
  }

  // Save cache if updated
  if (cacheUpdated) {
    await saveCache(cache);
  }

  // Sort by date descending
  summaries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return summaries;
}

/**
 * Group commits by date
 */
export function groupCommitsByDate(commits: CommitSummary[]): Map<string, CommitSummary[]> {
  const grouped = new Map<string, CommitSummary[]>();

  for (const commit of commits) {
    const dateKey = new Date(commit.date).toISOString().split('T')[0];
    
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(commit);
  }

  return grouped;
}

/**
 * Get summary statistics for a date range
 */
export function getCommitStats(commits: CommitSummary[]): {
  totalCommits: number;
  totalFilesChanged: number;
  totalInsertions: number;
  totalDeletions: number;
  byWorkspace: Record<string, number>;
} {
  const byWorkspace: Record<string, number> = {
    MantisNXT: 0,
    NXT_OCR: 0,
  };

  let totalFilesChanged = 0;
  let totalInsertions = 0;
  let totalDeletions = 0;

  for (const commit of commits) {
    byWorkspace[commit.workspace] = (byWorkspace[commit.workspace] || 0) + 1;
    totalFilesChanged += commit.filesChanged;
    totalInsertions += commit.insertions;
    totalDeletions += commit.deletions;
  }

  return {
    totalCommits: commits.length,
    totalFilesChanged,
    totalInsertions,
    totalDeletions,
    byWorkspace,
  };
}

