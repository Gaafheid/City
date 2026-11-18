export type Visit = { reviewId: string; rating: number | null; comment: string };

export function visitKey(city: string, country: string, place: string) {
  return 'visit:v1:' + JSON.stringify([country, city, place].map(value => value.normalize('NFKC').trim().toLowerCase()));
}

export function readVisit(key: string): Visit | null {
  try {
    const record = JSON.parse(localStorage.getItem(key) || 'null');
    return typeof record?.reviewId === 'string' ? record : null;
  } catch {
    return null;
  }
}

export function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}
