import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const checks: Record<string, unknown> = {
    DB_HOST: process.env.DB_HOST || '(not set)',
    DB_PORT: process.env.DB_PORT || '(not set)',
    DB_USER: process.env.DB_USER || '(not set)',
    DB_NAME: process.env.DB_NAME || '(not set)',
    DB_PASSWORD: process.env.DB_PASSWORD ? '***set***' : '(not set)',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || '(not set)',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '***set***' : '(not set)',
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID ? '***set***' : '(not set)',
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET ? '***set***' : '(not set)',
  };

  try {
    const [rows] = await pool.execute('SELECT 1 as ok');
    checks.database = 'Connected ✅';
    checks.query_result = rows;
  } catch (error: unknown) {
    const err = error as Error & { code?: string; errno?: number };
    checks.database = 'FAILED ❌';
    checks.error_message = err.message;
    checks.error_code = err.code;
  }

  return NextResponse.json(checks, { status: 200 });
}
