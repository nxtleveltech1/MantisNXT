/**
 * Multi-layer caching for extraction results
 * Layer 1: In-memory (5min TTL)
 * Layer 2: Database (24hr TTL)
 */
export class ExtractionCache {
  private memCache: Map<string, { data: any; expires: number }> = new Map();
  private readonly MEM_TTL_MS = 5 * 60 * 1000;
  private readonly DB_TTL_HOURS = 24;

  async get(job_id: string): Promise<any | null> {
    // Layer 1: Memory
    const memCached = this.memCache.get(job_id);
    if (memCached && memCached.expires > Date.now()) {
      return memCached.data;
    }

    // Layer 2: Database
    const { query } = await import('@/lib/database');
    const result = await query(
      `SELECT products, summary FROM spp.extraction_results
       WHERE job_id = $1 AND expires_at > NOW()`,
      [job_id]
    );

    if (result.rows.length > 0) {
      const products =
        typeof result.rows[0].products === 'string'
          ? JSON.parse(result.rows[0].products)
          : result.rows[0].products;
      const summary =
        typeof result.rows[0].summary === 'string'
          ? JSON.parse(result.rows[0].summary)
          : result.rows[0].summary;

      const data = summary && typeof summary === 'object'
        ? { ...summary, products: summary.products ?? products ?? [] }
        : { products: products ?? [], summary };

      this.memCache.set(job_id, {
        data,
        expires: Date.now() + this.MEM_TTL_MS
      });

      return data;
    }

    return null;
  }

  async set(job_id: string, data: any): Promise<void> {
    this.memCache.set(job_id, {
      data,
      expires: Date.now() + this.MEM_TTL_MS
    });

    const { query } = await import('@/lib/database');
    await query(
      `INSERT INTO spp.extraction_results (job_id, products, summary, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '${this.DB_TTL_HOURS} hours')
       ON CONFLICT (job_id) DO UPDATE
       SET products = $2, summary = $3, expires_at = NOW() + INTERVAL '${this.DB_TTL_HOURS} hours'`,
      [
        job_id,
        JSON.stringify(data.products ?? []),
        JSON.stringify({
          ...data,
          products: undefined, // products already stored separately
        }),
      ]
    );
  }

  async invalidate(job_id: string): Promise<void> {
    this.memCache.delete(job_id);
    
    const { query } = await import('@/lib/database');
    await query(
      `DELETE FROM spp.extraction_results WHERE job_id = $1`,
      [job_id]
    );
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, value] of this.memCache.entries()) {
      if (value.expires <= now) {
        this.memCache.delete(key);
      }
    }

    const { query } = await import('@/lib/database');
    await query(`DELETE FROM spp.extraction_results WHERE expires_at < NOW()`);
  }
}

export const extractionCache = new ExtractionCache();

// Cleanup every 10 minutes
setInterval(() => extractionCache.cleanup(), 10 * 60 * 1000);
