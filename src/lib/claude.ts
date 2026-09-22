import Anthropic from '@anthropic-ai/sdk';
import type { PlaceCandidate } from './places';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function highlightsTool(candidates: PlaceCandidate[]): Anthropic.Tool {
  return {
    name: 'provide_highlights',
    description: 'Provide a list of walking highlights for a city holiday.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['city', 'country', 'centerCoordinates', 'highlights'],
      properties: {
        city: { type: 'string' },
        country: { type: 'string' },
        centerCoordinates: {
          type: 'object',
          additionalProperties: false,
          required: ['lat', 'lng'],
          properties: {
            lat: { type: 'number' },
            lng: { type: 'number' },
          },
        },
        highlights: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'name', 'category', 'coordinates', 'shortDescription', 'backgroundInfo', 'tips', 'address'],
            properties: {
              id: { type: 'string' },
              name: candidates.length
                ? { type: 'string', enum: candidates.map((place) => place.name) }
                : { type: 'string' },
              category: {
                type: 'string',
                enum: ['monument', 'museum', 'church', 'viewpoint', 'market', 'park', 'restaurant', 'neighbourhood', 'other'],
              },
              coordinates: {
                type: 'object',
                additionalProperties: false,
                required: ['lat', 'lng'],
                properties: {
                  lat: { type: 'number' },
                  lng: { type: 'number' },
                },
              },
              shortDescription: { type: 'string' },
              backgroundInfo: { type: 'string' },
              tips: { type: 'string' },
              address: { type: 'string' },
              openingHours: { type: 'string' },
              entryFee: { type: 'string' },
            },
          },
        },
      },
    } as Anthropic.Tool['input_schema'],
  };
}

export async function generateCityHighlights(
  city: string,
  country: string,
  candidates: PlaceCandidate[] = [],
): Promise<unknown> {
  const location = country ? `${city}, ${country}` : city;
  const count = candidates.length ? Math.min(8, candidates.length) : 8;
  const grounding = candidates.length
    ? `Choose only from these verified nearby places. Use each title at most once, copy the title exactly, and use its supplied coordinates. Do not add any other location: ${JSON.stringify(candidates)}`
    : 'Use only real, verifiable locations with accurate GPS coordinates.';

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3500,
    system:
      'You are a knowledgeable travel guide with deep expertise in urban tourism. ' +
      'When given a city name, provide accurate, opinionated highlights that a curious traveller on foot would genuinely want to visit. ' +
      'Always include precise geographic coordinates for real, verifiable locations. Respond only in English.',
    tools: [highlightsTool(candidates)],
    tool_choice: { type: 'tool', name: 'provide_highlights' },
    messages: [
      {
        role: 'user',
        content: `Generate exactly ${count} highlights for a walking holiday in ${location}.

${grounding}

Requirements for each highlight:
- Real, verifiable location with accurate GPS coordinates (WGS84 decimal degrees)
- Mix of categories: monuments, museums, churches, viewpoints, markets, parks, restaurants, neighbourhoods
- id: a URL-safe slug, e.g. "rijksmuseum"
- shortDescription: exactly 1 sentence, what makes it special
- backgroundInfo: exactly 1 short paragraph (3-4 sentences) of cultural/historical context
- tips: one practical sentence — best time, entry cost, what to look out for
- address: street address or well-known location description
- openingHours and entryFee where applicable

Important: coordinates must refer to the named place, NOT the city centre. The city field should be the canonical English name. Also provide centerCoordinates (lat/lng) as a good initial map viewport for the city.`,
      },
    ],
  }, { timeout: 30000, maxRetries: 0 });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('No tool_use block in Claude response');
  }

  if (!candidates.length) return toolUse.input;

  const raw = toolUse.input as { highlights?: Array<{ name: string; coordinates: unknown }> };
  if (!Array.isArray(raw.highlights)) return raw;
  const byName = new Map(candidates.map((place) => [place.name, place]));
  const seen = new Set<string>();
  const highlights = raw.highlights.flatMap((highlight) => {
    const place = byName.get(highlight.name);
    if (!place || seen.has(place.name)) return [];
    seen.add(place.name);
    return [{ ...highlight, name: place.name, coordinates: place.coordinates }];
  });
  return { ...raw, highlights };
}
