import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = 'https://s-learning-kaka.vercel.app';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: courses } = await admin.from('courses').select('slug, updated_at').eq('status', 'published');

  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/courses', priority: '0.9', changefreq: 'daily' },
    ...(courses ?? []).map((c) => ({
      loc: `/courses/${c.slug}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: (c.updated_at as string)?.slice(0, 10),
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).send(xml);
}
