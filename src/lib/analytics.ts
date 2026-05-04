import { getCloudflareContext } from '@opennextjs/cloudflare';

interface AnalyticsDataset {
  writeDataPoint(data: { blobs?: string[]; doubles?: number[]; indexes?: string[] }): void;
}

function getDataset(): AnalyticsDataset | null {
  try {
    const { env } = getCloudflareContext();
    return (env as Record<string, unknown>).ANALYTICS as AnalyticsDataset ?? null;
  } catch {
    return null; // local dev or binding not configured
  }
}

/** Fired when a city is searched via the API */
export function trackSearch(city: string, country: string, status: 'success' | 'error' | 'cached', ms: number) {
  getDataset()?.writeDataPoint({
    blobs:   ['search', city, country, status],
    doubles: [ms],
    indexes: [city.toLowerCase()],
  });
}

/** Fired when a highlight is tapped or triggered by proximity */
export function trackHighlightView(city: string, name: string, category: string, trigger: 'tap' | 'proximity') {
  getDataset()?.writeDataPoint({
    blobs:   ['highlight_view', city, name, category, trigger],
    doubles: [],
    indexes: [city.toLowerCase()],
  });
}

/** Fired from the client via /api/event for any generic event */
export function trackEvent(event: string, city: string, extra: string[]) {
  getDataset()?.writeDataPoint({
    blobs:   [event, city, ...extra],
    indexes: [city.toLowerCase()],
  });
}
