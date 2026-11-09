import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { query } from './db';
import { Administrator, Client } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_fintech_loans_colombia_2026';

export interface AdminPayload {
  id: number;
  email: string;
  role: string;
  name: string;
  username?: string;
}

export interface ClientPayload {
  clientId: number;
  role: 'CLIENT';
  name: string;
  phone?: string;
  documentNumber?: string;
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

export function signClientToken(client: { id: number; first_name: string; last_name?: string | null; phone?: string | null; document_number?: string | null }): string {
  const fullName = `${client.first_name || ''} ${client.last_name || ''}`.trim();
  return jwt.sign(
    {
      clientId: client.id,
      role: 'CLIENT',
      name: fullName,
      phone: client.phone || '',
      documentNumber: client.document_number || '',
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function verifyClientToken(token: string): ClientPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.role === 'CLIENT' && decoded.clientId) {
      return decoded as ClientPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getClientFromRequest(req: NextRequest): Promise<Client | null> {
  let token = req.cookies.get('client_token')?.value;

  if (!token) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) return null;

  const payload = verifyClientToken(token);
  if (!payload || !payload.clientId) return null;

  try {
    const clients = await query<Client[]>(
      'SELECT * FROM clients WHERE id = ? AND status = "ACTIVO" AND portal_access = 1 LIMIT 1',
      [payload.clientId]
    );
    if (!clients || clients.length === 0) return null;
    return clients[0];
  } catch (error) {
    console.error('Error fetching client in auth check:', error);
    return null;
  }
}
