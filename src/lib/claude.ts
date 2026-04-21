import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const highlightsTool: Anthropic.Tool = {
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
            name: { type: 'string' },
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

export async function generateCityHighlights(city: string): Promise<unknown> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system:
      'You are a knowledgeable travel guide with deep expertise in urban tourism. ' +
      'When given a city name, provide accurate, opinionated highlights that a curious traveller on foot would genuinely want to visit. ' +
      'Always include precise geographic coordinates for real, verifiable locations. Respond only in English.',
    tools: [highlightsTool],
    tool_choice: { type: 'tool', name: 'provide_highlights' },
    messages: [
      {
        role: 'user',
        content: `Generate exactly 12 highlights for a walking holiday in ${city}.

Requirements for each highlight:
- Real, verifiable location with accurate GPS coordinates (WGS84 decimal degrees)
- Mix of categories: monuments, museums, churches, viewpoints, markets, parks, and at least one neighbourhood worth wandering
- id: a URL-safe slug, e.g. "rijksmuseum"
- shortDescription: max 2 sentences, what makes it worth visiting
- backgroundInfo: 3-4 rich paragraphs covering history, architecture, cultural significance, and interesting stories
- tips: practical advice — opening hours, best time of day, what to look out for
- address: street address or well-known location description
- openingHours and entryFee where applicable

Important: coordinates must be the actual building/entrance location, NOT the city centre. The city field should be the canonical English name. Also provide centerCoordinates (lat/lng) as a good initial map viewport for the city.`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('No tool_use block in Claude response');
  }

  return toolUse.input;
}
