import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

const joinSchema = z.object({
  invite_code: z.string().length(12),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const body = await req.json();
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: group, error: gErr } = await supabaseAdmin
    .from('friend_groups')
    .select()
    .eq('invite_code', parsed.data.invite_code)
    .single();

  if (gErr || !group) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
  }

  // Check if already a member
  const { data: existing } = await supabaseAdmin
    .from('group_members')
    .select()
    .eq('group_id', group.id)
    .eq('user_id', auth.userId)
    .single();

  if (existing) {
    return NextResponse.json({ group, already_member: true });
  }

  const { error: joinErr } = await supabaseAdmin
    .from('group_members')
    .insert({ group_id: group.id, user_id: auth.userId });

  if (joinErr) return NextResponse.json({ error: joinErr.message }, { status: 500 });

  return NextResponse.json({ group }, { status: 201 });
}
