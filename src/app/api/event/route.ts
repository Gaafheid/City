import { NextRequest, NextResponse } from 'next/server';
import { trackEvent } from '@/lib/analytics';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event  = String(body.event  ?? '').slice(0, 50);
    const city   = String(body.city   ?? '').slice(0, 100);
    const extra  = Array.isArray(body.extra)
      ? body.extra.slice(0, 5).map((v: unknown) => String(v).slice(0, 100))
      : [];

    if (event && city) trackEvent(event, city, extra);
  } catch {
    // analytics must never break the app
  }
  return NextResponse.json({ ok: true });
}
