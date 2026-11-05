import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ authenticated: false, admin: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      admin: {
        id: admin.id,
        name: admin.name,
        username: (admin as any).username || 'AnaPosada55',
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false, error: 'Error de verificación' }, { status: 500 });
  }
}
