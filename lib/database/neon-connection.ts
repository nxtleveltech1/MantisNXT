import { neon } from '@neondatabase/serverless';

const connectionString = process.env.NEON_SPP_DATABASE_URL || process.env.DATABASE_URL || '';
if (!connectionString) {
  throw new Error('Missing database connection string');
}

const sql = neon(connectionString) as unknown;

// Lightweight wrapper exposing a pg-like query(text, params) API
type QueryResult<T = unknown> = { rows: T[]; rowCount: number };

async function runQuery<T = unknown>(
  queryText: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const hasParams = Array.isArray(params) && params.length > 0;

  if (hasParams) {
    // Convert $1 style to tagged template: split by placeholders and interpolate values
    const parts: string[] = [];
    const values: unknown[] = [];
    const re = /\$(\d+)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(queryText))) {
      parts.push(queryText.slice(last, m.index));
      const idx = Number(m[1]) - 1;
      values.push(params![idx]);
      last = m.index + m[0].length;
    }
    parts.push(queryText.slice(last));

    // Build a function that calls sql`part0 ${v0} part1 ${v1} ...`
    const valueNames = values.map((_, i) => `v${i}`);
    const escaped = parts.map(p => p.replace(/`/g, '\\`').replace(/\$\{/g, '\\${'));
    let call = 'sql`';
    for (let i = 0; i < escaped.length; i++) {
      call += escaped[i];
      if (i < values.length) call += '${' + valueNames[i] + '}';
    }
    call += '`';
    const fn = new Function('sql', ...valueNames, `return ${call};`);
    const res = await (fn as any)(sql, ...values);
    const rows = Array.isArray(res) ? res : [res];
    return { rows: rows.filter(Boolean) as T[], rowCount: rows.length };
  } else {
    // No params; run as raw
    const res = await (sql as any).unsafe(queryText);
    const rows = Array.isArray(res) ? res : [res];
    return { rows: rows.filter(Boolean) as T[], rowCount: rows.length };
  }
}

async function withTransaction<T>(
  fn: (client: {
    query: <U = any>(queryText: string, params?: any[]) => Promise<QueryResult<U>>;
  }) => Promise<T>
): Promise<T> {
  await (sql as any).unsafe('BEGIN');
  try {
    const client = {
      query: runQuery,
    };
    const result = await fn(client);
    await (sql as any).unsafe('COMMIT');
    return result;
  } catch (err) {
    try {
      await (sql as any).unsafe('ROLLBACK');
    } catch {}
    throw err;
  }
}

export const neonDb = Object.assign(sql, {
  query: runQuery,
  withTransaction,
});
