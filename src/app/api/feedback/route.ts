import { getCloudflareContext } from '@opennextjs/cloudflare';
import { z } from 'zod';
import { wordCount } from '@/lib/visits';

const schema = z.object({
  place: z.string().min(1).max(600),
  reviewId: z.uuid(),
  rating: z.number().int().min(1).max(5).nullable(),
  comment: z.string().trim().max(800).refine(value => wordCount(value) <= 30),
});

export async function POST(req: Request) {
  const body = await req.text();
  if (body.length > 4096) return new Response(null, { status: 413 });
  const result = schema.safeParse(await new Response(body).json().catch(() => null));
  if (!result.success) return new Response(null, { status: 400 });
  const { place, reviewId, rating, comment } = result.data;
  const { ANALYTICS, HIGHLIGHTS_RATE_LIMIT } = getCloudflareContext().env as unknown as {
    ANALYTICS: { writeDataPoint(point: { blobs: string[]; indexes: string[]; doubles: number[] }): void };
    HIGHLIGHTS_RATE_LIMIT: { limit(args: { key: string }): Promise<{ success: boolean }> };
  };
  const allowed = await HIGHLIGHTS_RATE_LIMIT.limit({ key: 'feedback:' + (req.headers.get('cf-connecting-ip') || 'unknown') });
  if (!allowed.success) return new Response(null, { status: 429 });
  ANALYTICS.writeDataPoint({ indexes: [reviewId], blobs: ['place_feedback', place, comment], doubles: [rating ?? 0] });
  return new Response(null, { status: 204 });
}
