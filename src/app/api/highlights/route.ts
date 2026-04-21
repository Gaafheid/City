import { NextRequest, NextResponse } from 'next/server';
import { generateCityHighlights } from '@/lib/claude';
import { validateAndFilterHighlights } from '@/lib/validateHighlights';

// Simple in-process cache to avoid re-calling Claude for the same city
const serverCache = new Map<string, { data: unknown; at: number }>();
const SERVER_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  let city: string;
  try {
    const body = await req.json();
    city = String(body.city ?? '').trim().slice(0, 100);
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!city) {
    return NextResponse.json({ error: 'City name is required.' }, { status: 400 });
  }

  const cacheHit = serverCache.get(city.toLowerCase());
  if (cacheHit && Date.now() - cacheHit.at < SERVER_CACHE_TTL) {
    return NextResponse.json({ data: cacheHit.data });
  }

  let raw: unknown;
  try {
    raw = await generateCityHighlights(city);
  } catch (err) {
    console.error('Claude API error:', err);
    return NextResponse.json({ error: 'Failed to generate highlights. Please try again.' }, { status: 500 });
  }

  let validated;
  try {
    validated = validateAndFilterHighlights(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'TOO_FEW_VALID_HIGHLIGHTS') {
      return NextResponse.json(
        { error: 'Could not generate reliable highlights for this city. Please try again or try a different city.' },
        { status: 422 }
      );
    }
    console.error('Validation error:', err);
    return NextResponse.json({ error: 'Highlight data validation failed. Please try again.' }, { status: 422 });
  }

  serverCache.set(city.toLowerCase(), { data: validated, at: Date.now() });

  return NextResponse.json({ data: validated });
}
