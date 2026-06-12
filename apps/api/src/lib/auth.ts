import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, supabaseAdmin } from './supabase';

export interface AuthContext {
  userId: string;
  accessToken: string;
}

export async function requireAuth(req: NextRequest): Promise<AuthContext | NextResponse> {
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accessToken = authorization.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return { userId: user.id, accessToken };
}

export function isAuthError(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}
