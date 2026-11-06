import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { query } from './db';
import { Administrator } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_fintech_loans_colombia_2026';

export interface AdminPayload {
  id: number;
  email: string;
  role: string;
  name: string;
  username?: string;
}

export function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 12);
}

export function comparePassword(plainText: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plainText, hashed);
}

export function signAdminToken(admin: { id: number; email: string; role: string; name: string; username?: string }): string {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      name: admin.name,
      username: admin.username,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyAdminToken(token: string): AdminPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminPayload;
  } catch {
    return null;
  }
}

export async function getAdminFromRequest(req: NextRequest): Promise<Administrator | null> {
  let token = req.cookies.get('admin_token')?.value;

  if (!token) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) return null;

  const payload = verifyAdminToken(token);
  if (!payload || !payload.id) return null;

  try {
    const admins = await query<Administrator[]>(
      'SELECT id, name, username, email, role, is_active, created_at FROM administrators WHERE id = ? AND is_active = 1 LIMIT 1',
      [payload.id]
    );
    if (!admins || admins.length === 0) return null;
    return admins[0];
  } catch (error) {
    console.error('Error fetching admin in auth check:', error);
    return null;
  }
}
