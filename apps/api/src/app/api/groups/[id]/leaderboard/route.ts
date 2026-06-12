import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id: groupId } = await params;

  // Verify caller is a member of this group
  const { data: membership } = await supabaseAdmin
    .from('group_members')
    .select()
    .eq('group_id', groupId)
    .eq('user_id', auth.userId)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin.rpc('leaderboard_for_group', {
    p_group_id: groupId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ leaderboard: data });
}
