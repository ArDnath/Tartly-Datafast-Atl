import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand';
import { REVENUE_GUIDES } from '@/features/docs/content';
import { ALTERNATIVES } from '@/features/marketing/alternatives/alternatives-content';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = ['', '/pricing', '/docs', '/docs/install', '/legal', '/alternatives'];

  return [
    ...staticRoutes.map(route => ({
      url: `${BRAND.url}${route}`,
      lastModified: now,
      changeFrequency: route === '' ? ('weekly' as const) : ('monthly' as const),
      priority: route === '' ? 1 : route === '/pricing' ? 0.9 : 0.7,
    })),
    ...ALTERNATIVES.map(item => ({
      url: `${BRAND.url}/alternatives/${item.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...REVENUE_GUIDES.map(guide => ({
      url: `${BRAND.url}/docs/revenue-guides/${guide.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
