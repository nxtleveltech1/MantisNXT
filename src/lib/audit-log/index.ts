/**
 * Audit Log Module
 * 
 * Provides git commit tracking with AI-powered summarization
 * for development progress visibility.
 */

export {
  getCommitsWithSummaries,
  groupCommitsByDate,
  getCommitStats,
  type CommitInfo,
  type CommitSummary,
} from './commit-summarizer';

