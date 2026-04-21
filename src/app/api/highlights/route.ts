import { NextRequest, NextResponse } from 'next/server';
import { generateCityHighlights } from '@/lib/claude';
import { validateAndFilterHighlights } from '@/lib/validateHighlights';

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

  return NextResponse.json({ data: validated });
}
