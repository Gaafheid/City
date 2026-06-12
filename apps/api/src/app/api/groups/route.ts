import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

const createGroupSchema = z.object({
  name: z.string().min(1).max(60),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { data, error } = await supabaseAdmin
    .from('group_members')
    .select('group:friend_groups(*)')
    .eq('user_id', auth.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const groups = data?.map(r => r.group) ?? [];
  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const body = await req.json();
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: group, error: gErr } = await supabaseAdmin
    .from('friend_groups')
    .insert({ name: parsed.data.name, creator_id: auth.userId })
    .select()
    .single();

  if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });

  // Add creator as first member
  await supabaseAdmin
    .from('group_members')
    .insert({ group_id: group.id, user_id: auth.userId });

  return NextResponse.json({ group }, { status: 201 });
}
