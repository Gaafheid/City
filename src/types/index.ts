export type HighlightCategory =
  | 'monument'
  | 'museum'
  | 'church'
  | 'viewpoint'
  | 'market'
  | 'park'
  | 'restaurant'
  | 'neighbourhood'
  | 'other';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Highlight {
  id: string;
  name: string;
  category: HighlightCategory;
  coordinates: Coordinates;
  shortDescription: string;
  backgroundInfo: string;
  tips: string;
  address: string;
  openingHours?: string;
  entryFee?: string;
}

export interface CityHighlights {
  city: string;
  country: string;
  centerCoordinates: Coordinates;
  generatedAt: number;
  highlights: Highlight[];
}

export interface CachedCity {
  data: CityHighlights;
  cachedAt: number;
}
