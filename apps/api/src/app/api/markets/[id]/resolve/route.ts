import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

const resolveSchema = z.object({
  winning_option_id: z.string().uuid(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id: marketId } = await params;

  const body = await req.json();
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { winning_option_id } = parsed.data;

  // Load market — only creator or admin can resolve
  const { data: market, error: mErr } = await supabaseAdmin
    .from('markets')
    .select('*, options:market_options(*)')
    .eq('id', marketId)
    .single();

  if (mErr || !market) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (market.status !== 'open' && market.status !== 'closed') {
    return NextResponse.json({ error: 'Market cannot be resolved in its current state' }, { status: 409 });
  }

  const validOption = market.options.some((o: { id: string }) => o.id === winning_option_id);
  if (!validOption) return NextResponse.json({ error: 'Invalid winning option' }, { status: 400 });

  // Only creator can resolve (admin bypass handled by service role key in the future)
  if (market.creator_id !== auth.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Mark market resolved
  await supabaseAdmin
    .from('markets')
    .update({ status: 'resolved', winning_option_id, resolved_at: new Date().toISOString() })
    .eq('id', marketId);

  // Settle non-monetary bets (status update only — no wallet mutation needed)
  if (!market.is_monetary) {
    await supabaseAdmin
      .from('bets')
      .update({ status: 'lost' })
      .eq('market_id', marketId)
      .eq('status', 'active');

    await supabaseAdmin
      .from('bets')
      .update({ status: 'won' })
      .eq('market_id', marketId)
      .eq('option_id', winning_option_id)
      .eq('status', 'active');

    return NextResponse.json({ ok: true });
  }

  // Monetary settlement
  const winningOption = market.options.find((o: { id: string }) => o.id === winning_option_id);
  if (!winningOption || winningOption.total_staked_cents === 0) {
    // No winners — refund all
    const { data: activeBets } = await supabaseAdmin
      .from('bets')
      .select('*')
      .eq('market_id', marketId)
      .eq('status', 'active');

    for (const bet of activeBets ?? []) {
      const { data: wallet } = await supabaseAdmin
        .from('wallets')
        .select('id')
        .eq('user_id', bet.user_id)
        .single();

      if (wallet) {
        await supabaseAdmin.rpc('credit_wallet', {
          p_wallet_id: wallet.id,
          p_amount_cents: bet.amount_cents,
          p_type: 'payout',
          p_reference_id: bet.id,
        });
      }
      await supabaseAdmin.from('bets').update({ status: 'refunded', payout_cents: bet.amount_cents }).eq('id', bet.id);
    }

    return NextResponse.json({ ok: true, refunded: true });
  }

  const totalPool = market.total_pool_cents;
  const fee = market.platform_fee_pct;
  const netPool = Math.floor(totalPool * (1 - fee));
  const platformFee = totalPool - netPool;
  const winningStaked = winningOption.total_staked_cents;

  // Lose all bets on losing options
  await supabaseAdmin
    .from('bets')
    .update({ status: 'lost' })
    .eq('market_id', marketId)
    .neq('option_id', winning_option_id)
    .eq('status', 'active');

  // Pay out winners
  const { data: winningBets } = await supabaseAdmin
    .from('bets')
    .select('*')
    .eq('market_id', marketId)
    .eq('option_id', winning_option_id)
    .eq('status', 'active');

  for (const bet of winningBets ?? []) {
    const payoutCents = Math.floor((bet.amount_cents / winningStaked) * netPool);
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id')
      .eq('user_id', bet.user_id)
      .single();

    if (wallet) {
      await supabaseAdmin.rpc('credit_wallet', {
        p_wallet_id: wallet.id,
        p_amount_cents: payoutCents,
        p_type: 'payout',
        p_reference_id: bet.id,
      });
    }
    await supabaseAdmin.from('bets').update({ status: 'won', payout_cents: payoutCents }).eq('id', bet.id);
  }

  // Record platform fee in transactions (credited to platform wallet — tracked separately)
  console.log(`Market ${marketId} resolved. Platform fee: ${platformFee} cents`);

  return NextResponse.json({ ok: true, platform_fee_cents: platformFee });
}
