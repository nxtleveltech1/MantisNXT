import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { sql } from '@/lib/pos-app/neon';

// POST /api/pos-app/db/init - Initialize database (run SQL scripts)
export async function POST(request: NextRequest) {
  try {
    const scripts = [
      '01-create-tables.sql',
      '02-seed-data.sql',
      '03-advanced-functions.sql',
      '04-audio-visual-products.sql',
    ];

    const results = [];

    for (const scriptName of scripts) {
      try {
        const filePath = join(process.cwd(), 'scripts', 'pos-app', scriptName);
        const content = readFileSync(filePath, 'utf-8');
        
        // Split by semicolons and filter out empty statements and comments
        const statements = content
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\/\*/));

        for (const statement of statements) {
          if (statement.trim()) {
            await sql(statement);
          }
        }

        results.push({ script: scriptName, status: 'success' });
      } catch (error: any) {
        results.push({ script: scriptName, status: 'error', error: error.message });
      }
    }

    return NextResponse.json({ results, message: 'Database initialization completed' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

