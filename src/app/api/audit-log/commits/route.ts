/**
 * Audit Log API - Git Commits with AI Summaries
 * 
 * GET /api/audit-log/commits
 * 
 * Query params:
 * - from: Start date (ISO format, defaults to 14 days ago)
 * - to: End date (ISO format, defaults to today)
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getCommitsWithSummaries, 
  groupCommitsByDate, 
  getCommitStats,
  type CommitSummary 
} from '@/lib/audit-log';

interface DayGroup {
  date: string;
  displayDate: string;
  commits: CommitSummary[];
  stats: {
    total: number;
    mantisNXT: number;
    nxtOCR: number;
    filesChanged: number;
    insertions: number;
    deletions: number;
  };
}

interface AuditLogResponse {
  success: boolean;
  data: {
    days: DayGroup[];
    summary: {
      totalCommits: number;
      totalFilesChanged: number;
      totalInsertions: number;
      totalDeletions: number;
      byWorkspace: Record<string, number>;
      dateRange: {
        from: string;
        to: string;
      };
    };
  };
  generatedAt: string;
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = date.toISOString().split('T')[0];
  const todayOnly = today.toISOString().split('T')[0];
  const yesterdayOnly = yesterday.toISOString().split('T')[0];

  if (dateOnly === todayOnly) {
    return 'Today';
  } else if (dateOnly === yesterdayOnly) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-ZA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse date params
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    // Default to last 14 days
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 14);
    
    const from = fromParam || defaultFrom.toISOString().split('T')[0];
    const to = toParam || new Date().toISOString().split('T')[0];

    // Get commits with AI summaries
    const commits = await getCommitsWithSummaries(from, to);
    
    // Group by date
    const groupedByDate = groupCommitsByDate(commits);
    
    // Build day groups
    const days: DayGroup[] = [];
    
    // Sort dates descending
    const sortedDates = Array.from(groupedByDate.keys()).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    for (const date of sortedDates) {
      const dayCommits = groupedByDate.get(date) || [];
      
      const mantisNXT = dayCommits.filter(c => c.workspace === 'MantisNXT').length;
      const nxtOCR = dayCommits.filter(c => c.workspace === 'NXT_OCR').length;
      const filesChanged = dayCommits.reduce((sum, c) => sum + c.filesChanged, 0);
      const insertions = dayCommits.reduce((sum, c) => sum + c.insertions, 0);
      const deletions = dayCommits.reduce((sum, c) => sum + c.deletions, 0);

      days.push({
        date,
        displayDate: formatDisplayDate(date),
        commits: dayCommits,
        stats: {
          total: dayCommits.length,
          mantisNXT,
          nxtOCR,
          filesChanged,
          insertions,
          deletions,
        },
      });
    }

    // Get overall stats
    const stats = getCommitStats(commits);

    const response: AuditLogResponse = {
      success: true,
      data: {
        days,
        summary: {
          ...stats,
          dateRange: { from, to },
        },
      },
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Audit log API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch audit log',
      },
      { status: 500 }
    );
  }
}

