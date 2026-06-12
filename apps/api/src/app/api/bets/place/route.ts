import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

const placeBetSchema = z.object({
  market_id: z.string().uuid(),
  option_id: z.string().uuid(),
  amount_cents: z.number().int().min(1),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const body = await req.json();
  const parsed = placeBetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { market_id, option_id, amount_cents } = parsed.data;

  // Use a database transaction via RPC for atomicity
  const { data, error } = await supabaseAdmin.rpc('place_bet', {
    p_user_id: auth.userId,
    p_market_id: market_id,
    p_option_id: option_id,
    p_amount_cents: amount_cents,
  });

  if (error) {
    // Map known error codes to HTTP responses
    if (error.message.includes('Market is not open')) {
      return NextResponse.json({ error: 'Market is not open for betting' }, { status: 409 });
    }
    if (error.message.includes('Insufficient balance')) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 422 });
    }
    if (error.message.includes('User is banned') || error.message.includes('self-excluded')) {
      return NextResponse.json({ error: 'Account is not eligible for betting' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
