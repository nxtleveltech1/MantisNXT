import { query } from '../../database';
import type {
  AuditEvent,
  DecisionExplanation,
  WorkflowExplanation,
} from './types';

/**
 * Explainer - Generates human-readable explanations of AI decisions and actions
 */
export class Explainer {
  private readonly templates = {
    toolExecution: {
      basic: 'Executed {toolName} with parameters: {params}',
      detailed: 'The AI executed the {toolName} tool with the following parameters: {params}. This resulted in: {result}',
      expert: 'Tool execution: {toolName}\nParameters: {params}\nResult: {result}\nContext: {context}',
    },
    decision: {
      basic: 'Made decision: {decision}',
      detailed: 'The AI decided to {decision} because: {reasoning}. Alternative options considered: {alternatives}',
      expert: 'Decision Analysis:\nPrimary Decision: {decision}\nReasoning: {reasoning}\nAlternatives Evaluated: {alternatives}\nConfidence: {confidence}%',
    },
    accessCheck: {
      basic: 'Access {result} for {resource}',
      detailed: 'Access {result} for resource "{resource}". This ensures proper security controls are maintained.',
      expert: 'Access Control Decision:\nResource: {resource}\nResult: {result}\nSecurity Context: {context}',
    },
    error: {
      basic: 'Encountered error: {error}',
      detailed: 'An error occurred: {error}. This has been logged for debugging purposes.',
      expert: 'Error Analysis:\nError: {error}\nStack Trace: {stack}\nContext: {context}\nSeverity: {severity}',
    },
  };

  /**
   * Explain a tool call
   */
  explainToolCall(
    toolName: string,
    params: Record<string, any>,
    result: any,
    expertiseLevel: 'basic' | 'detailed' | 'expert' = 'detailed'
  ): DecisionExplanation {
    const template = this.templates.toolExecution[expertiseLevel];
    const formatted = template
      .replace('{toolName}', toolName)
      .replace('{params}', this.formatParams(params))
      .replace('{result}', this.formatResult(result))
      .replace('{context}', 'Tool execution in AI workflow');

    return {
      decision: `Execute ${toolName}`,
      reasoning: `The AI determined that executing the ${toolName} tool was necessary to accomplish the current task.`,
      alternatives: [],
      evidence: [`Tool parameters: ${this.formatParams(params)}`, `Execution result: ${this.formatResult(result)}`],
      formatted,
    };
  }

  /**
   * Explain a decision
   */
  explainDecision(
    decision: string,
    reasoning: string,
    alternatives: string[] = [],
    expertiseLevel: 'basic' | 'detailed' | 'expert' = 'detailed',
    confidence?: number
  ): DecisionExplanation {
    const template = this.templates.decision[expertiseLevel];
    const formatted = template
      .replace('{decision}', decision)
      .replace('{reasoning}', reasoning)
      .replace('{alternatives}', alternatives.join(', ') || 'None explicitly considered')
      .replace('{confidence}', confidence ? `${Math.round(confidence * 100)}` : 'Not specified');

    return {
      decision,
      reasoning,
      alternatives,
      confidence,
      evidence: [
        `Primary reasoning: ${reasoning}`,
        `Alternatives considered: ${alternatives.length}`,
        confidence ? `Confidence level: ${Math.round(confidence * 100)}%` : undefined,
      ].filter(Boolean),
      formatted,
    };
  }

  /**
   * Explain access denial
   */
  explainAccessDenial(
    resource: string,
    reason: string,
    expertiseLevel: 'basic' | 'detailed' | 'expert' = 'detailed'
  ): DecisionExplanation {
    const template = this.templates.accessCheck[expertiseLevel];
    const formatted = template
      .replace('{resource}', resource)
      .replace('{result}', 'denied')
      .replace('{context}', reason);

    return {
      decision: `Deny access to ${resource}`,
      reasoning: reason,
      alternatives: ['Grant access', 'Request additional permissions'],
      evidence: [`Security policy violation`, `Resource protection requirements`],
      formatted,
    };
  }

  /**
   * Explain a complete workflow/session
   */
  async explainWorkflow(
    sessionId: string,
    expertiseLevel: 'basic' | 'detailed' | 'expert' = 'detailed'
  ): Promise<string[]> {
    const events = await this.getSessionEvents(sessionId);

    if (events.length === 0) {
      return ['No audit events found for this session.'];
    }

    const explanations: string[] = [];
    let stepNumber = 1;

    for (const event of events) {
      const explanation = await this.explainEvent(event, expertiseLevel, stepNumber);
      explanations.push(explanation);
      stepNumber++;
    }

    return explanations;
  }

  /**
   * Generate summary of audit events
   */
  generateSummary(events: AuditEvent[], expertiseLevel: 'basic' | 'detailed' | 'expert' = 'detailed'): string {
    if (events.length === 0) {
      return 'No events to summarize.';
    }

    const stats = this.calculateEventStats(events);

    switch (expertiseLevel) {
      case 'basic':
        return `Session summary: ${events.length} events, ${stats.errors} errors, ${stats.decisions} decisions made.`;

      case 'detailed':
        return `Audit Summary:
- Total Events: ${events.length}
- Tool Executions: ${stats.toolExecutions}
- Decisions Made: ${stats.decisions}
- Access Checks: ${stats.accessChecks}
- Errors: ${stats.errors}
- Most Used Tool: ${stats.topTool || 'None'}
- Time Span: ${this.formatTimeSpan(events)}`;

      case 'expert':
        return `Detailed Audit Analysis:
Events: ${events.length}
Breakdown:
  - Tool Executions: ${stats.toolExecutions}
  - Decisions: ${stats.decisions}
  - Access Checks: ${stats.accessChecks}
  - Errors: ${stats.errors}
  - Conversations: ${stats.conversations}

Performance Metrics:
  - Error Rate: ${((stats.errors / events.length) * 100).toFixed(1)}%
  - Top Tool: ${stats.topTool || 'None'}
  - Time Range: ${this.formatTimeSpan(events)}

Security Status: ${stats.accessChecks > 0 ? 'Access controls active' : 'No access checks recorded'}`;
    }
  }

  /**
   * Export audit trail in various formats
   */
  async exportAuditTrail(
    sessionId: string,
    format: 'json' | 'markdown' | 'text' = 'markdown'
  ): Promise<string> {
    const events = await this.getSessionEvents(sessionId);

    switch (format) {
      case 'json':
        return JSON.stringify(events, null, 2);

      case 'markdown':
        return this.formatAsMarkdown(events);

      case 'text':
        return this.formatAsText(events);

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Format explanation for user consumption
   */
  formatForUser(
    explanation: DecisionExplanation,
    expertiseLevel: 'basic' | 'detailed' | 'expert' = 'detailed'
  ): string {
    switch (expertiseLevel) {
      case 'basic':
        return explanation.decision;

      case 'detailed':
        return `${explanation.decision}\n\n${explanation.reasoning}`;

      case 'expert':
        return `Decision: ${explanation.decision}
Reasoning: ${explanation.reasoning}
${explanation.alternatives.length > 0 ? `Alternatives: ${explanation.alternatives.join(', ')}` : ''}
${explanation.confidence ? `Confidence: ${Math.round(explanation.confidence * 100)}%` : ''}
Evidence: ${explanation.evidence.join('; ')}`;

      default:
        return explanation.formatted;
    }
  }

  /**
   * Get all events for a session
   */
  private async getSessionEvents(sessionId: string): Promise<AuditEvent[]> {
    const result = await query(
      `SELECT
        id, event_type, severity, org_id, user_id, session_id,
        tool_name, parameters, result, reasoning, alternatives,
        timestamp, metadata
      FROM ai_audit_events
      WHERE session_id = $1
      ORDER BY timestamp ASC`,
      [sessionId]
    );

    return result.rows.map(row => ({
      id: row.id,
      eventType: row.event_type,
      severity: row.severity,
      timestamp: new Date(row.timestamp),
      orgId: row.org_id,
      userId: row.user_id,
      sessionId: row.session_id,
      toolName: row.tool_name,
      parameters: row.parameters,
      result: row.result,
      reasoning: row.reasoning,
      alternatives: row.alternatives,
      metadata: row.metadata,
    }));
  }

  /**
   * Explain a single event
   */
  private async explainEvent(
    event: AuditEvent,
    expertiseLevel: 'basic' | 'detailed' | 'expert',
    stepNumber: number
  ): Promise<string> {
    const timestamp = event.timestamp.toISOString();
    let explanation = `Step ${stepNumber} (${timestamp}): `;

    switch (event.eventType) {
      case 'tool_execution':
        explanation += this.explainToolCall(
          event.toolName || 'Unknown Tool',
          event.parameters || {},
          event.result,
          expertiseLevel
        ).formatted;
        break;

      case 'decision':
        explanation += this.explainDecision(
          event.metadata?.decision || 'Unknown Decision',
          event.reasoning || 'No reasoning provided',
          event.alternatives || [],
          expertiseLevel,
          event.metadata?.confidence
        ).formatted;
        break;

      case 'access_check':
        if (event.result === false) {
          explanation += this.explainAccessDenial(
            event.metadata?.resource || 'Unknown Resource',
            event.metadata?.reason || 'Security policy',
            expertiseLevel
          ).formatted;
        } else {
          explanation += `Access granted to ${event.metadata?.resource || 'resource'}`;
        }
        break;

      case 'error':
        explanation += this.templates.error[expertiseLevel]
          .replace('{error}', event.metadata?.error || 'Unknown error')
          .replace('{stack}', event.metadata?.stack || 'No stack trace')
          .replace('{context}', 'Error occurred during AI operation')
          .replace('{severity}', event.severity);
        break;

      case 'conversation':
        explanation += `Message: ${event.metadata?.message || 'No message content'}`;
        break;

      default:
        explanation += `Unknown event type: ${event.eventType}`;
    }

    return explanation;
  }

  /**
   * Calculate statistics from events
   */
  private calculateEventStats(events: AuditEvent[]) {
    const stats = {
      toolExecutions: 0,
      decisions: 0,
      accessChecks: 0,
      errors: 0,
      conversations: 0,
      topTool: '',
    };

    const toolCounts: Record<string, number> = {};

    for (const event of events) {
      switch (event.eventType) {
        case 'tool_execution':
          stats.toolExecutions++;
          if (event.toolName) {
            toolCounts[event.toolName] = (toolCounts[event.toolName] || 0) + 1;
          }
          break;
        case 'decision':
          stats.decisions++;
          break;
        case 'access_check':
          stats.accessChecks++;
          break;
        case 'error':
          stats.errors++;
          break;
        case 'conversation':
          stats.conversations++;
          break;
      }
    }

    // Find most used tool
    let maxCount = 0;
    for (const [tool, count] of Object.entries(toolCounts)) {
      if (count > maxCount) {
        maxCount = count;
        stats.topTool = tool;
      }
    }

    return stats;
  }

  /**
   * Format time span of events
   */
  private formatTimeSpan(events: AuditEvent[]): string {
    if (events.length === 0) return 'No events';

    const startTime = events[0].timestamp;
    const endTime = events[events.length - 1].timestamp;
    const duration = endTime.getTime() - startTime.getTime();

    const minutes = Math.floor(duration / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);

    return `${minutes}m ${seconds}s`;
  }

  /**
   * Format parameters for display
   */
  private formatParams(params: Record<string, any>): string {
    try {
      return Object.keys(params).length > 0
        ? JSON.stringify(params, null, 2)
        : 'No parameters';
    } catch {
      return 'Complex parameters (cannot display)';
    }
  }

  /**
   * Format result for display
   */
  private formatResult(result: any): string {
    try {
      if (typeof result === 'string') return result;
      if (typeof result === 'number' || typeof result === 'boolean') return String(result);
      return JSON.stringify(result, null, 2);
    } catch {
      return 'Complex result (cannot display)';
    }
  }

  /**
   * Format events as Markdown
   */
  private formatAsMarkdown(events: AuditEvent[]): string {
    let markdown = '# AI Audit Trail\n\n';
    markdown += `Generated: ${new Date().toISOString()}\n\n`;
    markdown += `Total Events: ${events.length}\n\n`;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      markdown += `## Step ${i + 1}: ${event.eventType}\n\n`;
      markdown += `- **Time**: ${event.timestamp.toISOString()}\n`;
      markdown += `- **Severity**: ${event.severity}\n`;
      markdown += `- **Type**: ${event.eventType}\n`;

      if (event.toolName) {
        markdown += `- **Tool**: ${event.toolName}\n`;
      }

      if (event.reasoning) {
        markdown += `- **Reasoning**: ${event.reasoning}\n`;
      }

      if (event.alternatives && event.alternatives.length > 0) {
        markdown += `- **Alternatives**: ${event.alternatives.join(', ')}\n`;
      }

      markdown += '\n';
    }

    return markdown;
  }

  /**
   * Format events as plain text
   */
  private formatAsText(events: AuditEvent[]): string {
    let text = 'AI AUDIT TRAIL\n';
    text += '=' .repeat(50) + '\n';
    text += `Generated: ${new Date().toISOString()}\n`;
    text += `Total Events: ${events.length}\n\n`;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      text += `STEP ${i + 1}: ${event.eventType.toUpperCase()}\n`;
      text += `Time: ${event.timestamp.toISOString()}\n`;
      text += `Severity: ${event.severity}\n`;

      if (event.toolName) {
        text += `Tool: ${event.toolName}\n`;
      }

      if (event.reasoning) {
        text += `Reasoning: ${event.reasoning}\n`;
      }

      text += '\n';
    }

    return text;
  }
}

// Singleton instance
export const explainer = new Explainer();