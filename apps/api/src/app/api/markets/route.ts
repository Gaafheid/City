import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

const createMarketSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().max(1000).optional(),
  category: z.enum(['sports', 'politics', 'entertainment', 'friends', 'other']).optional(),
  options: z.array(z.string().min(1).max(100)).min(2).max(10),
  is_monetary: z.boolean().default(false),
  resolution_method: z.enum(['admin', 'creator', 'community_vote']).default('creator'),
  close_at: z.string().datetime().optional(),
  group_id: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const is_monetary = searchParams.get('is_monetary');
  const group_id = searchParams.get('group_id');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  let query = supabaseAdmin
    .from('markets')
    .select(`
      *,
      options:market_options(*),
      creator:profiles!creator_id(id, username)
    `)
    .in('status', ['open', 'closed', 'resolved'])
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq('category', category);
  if (is_monetary !== null) query = query.eq('is_monetary', is_monetary === 'true');
  if (group_id) {
    const { data: gm } = await supabaseAdmin
      .from('group_markets')
      .select('market_id')
      .eq('group_id', group_id);
    const ids = gm?.map(r => r.market_id) ?? [];
    if (ids.length === 0) return NextResponse.json({ markets: [] });
    query = query.in('id', ids);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ markets: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const body = await req.json();
  const parsed = createMarketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, description, category, options, is_monetary, resolution_method, close_at, group_id } = parsed.data;

  const { data: market, error: marketError } = await supabaseAdmin
    .from('markets')
    .insert({
      creator_id: auth.userId,
      title,
      description,
      category,
      is_monetary,
      resolution_method,
      close_at,
      status: 'open',
    })
    .select()
    .single();

  if (marketError) return NextResponse.json({ error: marketError.message }, { status: 500 });

  const { error: optionsError } = await supabaseAdmin
    .from('market_options')
    .insert(options.map((opt, i) => ({
      market_id: market.id,
      title: opt,
      sort_order: i,
    })));

  if (optionsError) {
    await supabaseAdmin.from('markets').delete().eq('id', market.id);
    return NextResponse.json({ error: optionsError.message }, { status: 500 });
  }

  if (group_id) {
    const { error: gmError } = await supabaseAdmin
      .from('group_markets')
      .insert({ group_id, market_id: market.id });
    if (gmError) {
      // Non-fatal — market is created, just not linked to group
      console.error('Failed to link market to group:', gmError.message);
    }
  }

  const { data: full } = await supabaseAdmin
    .from('markets')
    .select('*, options:market_options(*), creator:profiles!creator_id(id, username)')
    .eq('id', market.id)
    .single();

  return NextResponse.json({ market: full }, { status: 201 });
}
