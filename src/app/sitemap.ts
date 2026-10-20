import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://viewthetown.com',
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
