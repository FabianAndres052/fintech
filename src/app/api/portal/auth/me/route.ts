import { NextRequest, NextResponse } from 'next/server';
import { getClientFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { password_hash, ...safeClient } = client as any;

    return NextResponse.json({
      authenticated: true,
      client: safeClient,
    });
  } catch (error) {
    console.error('Error fetching portal client me:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

