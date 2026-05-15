import { NextRequest, NextResponse } from 'next/server';
import { generateCityHighlights } from '@/lib/claude';
import { validateAndFilterHighlights } from '@/lib/validateHighlights';
import { fetchCityBoundary } from '@/lib/geo';
import { trackSearch } from '@/lib/analytics';

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  let city: string;
  let country: string;
  let center: { lat: number; lng: number } | undefined;
  try {
    const body = await req.json();
    city = String(body.city ?? '').trim().slice(0, 100);
    country = String(body.country ?? '').trim().slice(0, 100);
    const lat = parseFloat(body.lat);
    const lng = parseFloat(body.lng);
    if (isFinite(lat) && isFinite(lng)) center = { lat, lng };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!city) {
    return NextResponse.json({ error: 'City name is required.' }, { status: 400 });
  }

  // Fetch city boundary and generate highlights in parallel — boundary fetch
  // adds no latency since Claude takes much longer.
  const [raw, boundary] = await Promise.allSettled([
    generateCityHighlights(city, country),
    fetchCityBoundary(city, country),
  ]);

  if (raw.status === 'rejected') {
    console.error('Claude API error:', raw.reason);
    trackSearch(city, country, 'error', Date.now() - t0);
    return NextResponse.json({ error: 'Failed to generate highlights. Please try again.' }, { status: 500 });
  }

  const resolvedBoundary = boundary.status === 'fulfilled' ? boundary.value : null;

  let validated;
  try {
    validated = validateAndFilterHighlights(raw.value, center, resolvedBoundary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    trackSearch(city, country, 'error', Date.now() - t0);
    if (msg === 'TOO_FEW_VALID_HIGHLIGHTS') {
      return NextResponse.json(
        { error: 'Could not generate reliable highlights for this city. Please try again or try a different city.' },
        { status: 422 }
      );
    }
    console.error('Validation error:', err);
    return NextResponse.json({ error: 'Highlight data validation failed. Please try again.' }, { status: 422 });
  }

  trackSearch(city, country, 'success', Date.now() - t0);
  return NextResponse.json({ data: validated });
}
