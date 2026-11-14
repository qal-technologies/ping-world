import type { MetadataRoute } from 'next';
import { tools } from '@/lib/general/data';
import { toolDocsDb } from '@/lib/general/docs-data';
import { COMPANY } from '@/lib/config/company';

const BASE_URL = COMPANY.domain;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Core pages
  const corePages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/tools`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/quiz`,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/message`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/composer`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/text-editor`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/media`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/pricing`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // Company/info pages
  const companyPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/about`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privacy`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/countries`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Tool sub-pages from the tools registry
  const toolPages: MetadataRoute.Sitemap = tools
    .filter((t) => t.href.startsWith('/tools/'))
    .map((t) => ({
      url: `${BASE_URL}${t.href}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));

  // Docs pages — auto-generated from tool IDs
  const docPages: MetadataRoute.Sitemap = tools
    .filter((t) => t.id && toolDocsDb[t.id])
    .map((t) => ({
      url: `${BASE_URL}/docs/${t.id}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

  const allPages = [...corePages, ...companyPages, ...toolPages, ...docPages];

  const uniquePages = Array.from(
    new Map(allPages.map((page) => [page.url, page])).values(),
  );

  return uniquePages;
}
