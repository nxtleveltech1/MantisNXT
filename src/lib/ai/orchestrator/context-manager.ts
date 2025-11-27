/**
 * Context Manager
 * Manages session state, conversation history, and context retrieval for the orchestrator
 */

import {
  OrchestratorSession,
  ConversationTurn,
  orchestratorSessionSchema,
  conversationTurnSchema,
} from './types';

/**
 * Context Manager - Singleton for managing orchestrator sessions and context
 */
export class ContextManager {
  private static instance: ContextManager;
  private sessions = new Map<string, OrchestratorSession>();
  private conversationHistory = new Map<string, ConversationTurn[]>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startCleanupInterval();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  /**
   * Create a new orchestrator session
   */
  public createSession(userId: string, orgId?: string): OrchestratorSession {
    const session: OrchestratorSession = {
      id: crypto.randomUUID(),
      userId,
      orgId,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      metadata: {},
      preferences: {},
    };

    // Validate session
    const validatedSession = orchestratorSessionSchema.parse(session);

    // Store session
    this.sessions.set(session.id, validatedSession);
    this.conversationHistory.set(session.id, []);

    return validatedSession;
  }

  /**
   * Load an existing session by ID
   */
  public loadSession(sessionId: string): OrchestratorSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Update last activity
    session.lastActivityAt = new Date();
    return session;
  }

  /**
   * Save/update a session
   */
  public saveSession(session: OrchestratorSession): void {
    const validatedSession = orchestratorSessionSchema.parse(session);
    this.sessions.set(session.id, validatedSession);
  }

  /**
   * Get conversation history for a session
   */
  public getConversationHistory(sessionId: string, limit?: number): ConversationTurn[] {
    const history = this.conversationHistory.get(sessionId) || [];
    if (!limit) return [...history];

    // Return most recent turns up to the limit
    return history.slice(-limit);
  }

  /**
   * Add a conversation turn to a session
   */
  public addTurn(sessionId: string, turn: ConversationTurn): void {
    const validatedTurn = conversationTurnSchema.parse(turn);

    // Ensure session exists
    if (!this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Get or create history array
    let history = this.conversationHistory.get(sessionId);
    if (!history) {
      history = [];
      this.conversationHistory.set(sessionId, history);
    }

    // Add turn
    history.push(validatedTurn);

    // Update session activity
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = new Date();
    }

    // Prune old history if needed (keep last 1000 turns)
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
  }

  /**
   * Get relevant context for a session and request
   * This is a simplified implementation - in production, this would:
   * - Query vector databases for semantic search
   * - Retrieve relevant documents, previous conversations, user preferences
   * - Apply RAG (Retrieval-Augmented Generation) techniques
   */
  public async getRelevantContext(
    session: OrchestratorSession,
    requestMessage: string
  ): Promise<string> {
    const contextParts: string[] = [];

    // Add user preferences if available
    if (session.preferences && Object.keys(session.preferences).length > 0) {
      contextParts.push(`User Preferences: ${JSON.stringify(session.preferences)}`);
    }

    // Add recent conversation context (last 5 turns)
    const recentHistory = this.getConversationHistory(session.id, 5);
    if (recentHistory.length > 0) {
      const historyContext = recentHistory
        .map(turn => `${turn.role}: ${turn.content}`)
        .join('\n');
      contextParts.push(`Recent Conversation:\n${historyContext}`);
    }

    // Add session metadata if relevant
    if (session.metadata && Object.keys(session.metadata).length > 0) {
      contextParts.push(`Session Context: ${JSON.stringify(session.metadata)}`);
    }

    // TODO: Implement semantic search for relevant documents
    // This would search through:
    // - User's previous interactions
    // - Relevant documentation
    // - Knowledge base articles
    // - System state information

    // For now, return basic context
    return contextParts.join('\n\n');
  }

  /**
   * Prune old sessions based on maximum age
   */
  public pruneOldSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): number { // 24 hours default
    const cutoffTime = Date.now() - maxAgeMs;
    let prunedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivityAt.getTime() < cutoffTime) {
        this.sessions.delete(sessionId);
        this.conversationHistory.delete(sessionId);
        prunedCount++;
      }
    }

    return prunedCount;
  }

  /**
   * Get session statistics
   */
  public getStats() {
    const sessions = Array.from(this.sessions.values());
    const totalConversations = Array.from(this.conversationHistory.values())
      .reduce((sum, history) => sum + history.length, 0);

    const avgConversationLength = sessions.length > 0
      ? totalConversations / sessions.length
      : 0;

    return {
      totalSessions: sessions.length,
      totalConversationTurns: totalConversations,
      averageConversationLength: Math.round(avgConversationLength * 100) / 100,
      oldestSession: sessions.length > 0
        ? sessions.reduce((oldest, session) =>
            session.createdAt < oldest.createdAt ? session : oldest
          ).createdAt
        : null,
      newestSession: sessions.length > 0
        ? sessions.reduce((newest, session) =>
            session.createdAt > newest.createdAt ? session : newest
          ).createdAt
        : null,
    };
  }

  /**
   * Export all session data (for backup/debugging)
   */
  public exportData() {
    return {
      sessions: Array.from(this.sessions.entries()),
      conversationHistory: Array.from(this.conversationHistory.entries()),
      stats: this.getStats(),
      exportTime: new Date(),
    };
  }

  /**
   * Import session data (for restore/testing)
   */
  public importData(data: {
    sessions: Array<[string, OrchestratorSession]>;
    conversationHistory: Array<[string, ConversationTurn[]]>;
  }): void {
    // Clear existing data
    this.sessions.clear();
    this.conversationHistory.clear();

    // Import sessions
    for (const [sessionId, session] of data.sessions) {
      try {
        const validatedSession = orchestratorSessionSchema.parse(session);
        this.sessions.set(sessionId, validatedSession);
      } catch (error) {
        console.warn(`Failed to import session ${sessionId}:`, error);
      }
    }

    // Import conversation history
    for (const [sessionId, history] of data.conversationHistory) {
      try {
        const validatedHistory = history.map(turn => conversationTurnSchema.parse(turn));
        this.conversationHistory.set(sessionId, validatedHistory);
      } catch (error) {
        console.warn(`Failed to import conversation history for session ${sessionId}:`, error);
      }
    }
  }

  /**
   * Clear all data (for testing)
   */
  public clear(): void {
    this.sessions.clear();
    this.conversationHistory.clear();
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanupInterval(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      const pruned = this.pruneOldSessions();
      if (pruned > 0) {
        console.log(`Pruned ${pruned} old sessions`);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Stop cleanup interval (for testing/cleanup)
   */
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get all active session IDs
   */
  public getActiveSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Check if session exists
   */
  public hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Get conversation turn count for a session
   */
  public getConversationLength(sessionId: string): number {
    return this.conversationHistory.get(sessionId)?.length || 0;
  }
}

// Export singleton instance
export const contextManager = ContextManager.getInstance();