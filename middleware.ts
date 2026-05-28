import { createClient } from '@supabase/supabase-js';

export const config = { matcher: ['/courses/:slug*'] };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const SITE_URL = 'https://s-learning-kaka.vercel.app';

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const slugMatch = url.pathname.match(/^\/courses\/([^/]+)$/);

  if (!slugMatch) return fetch(request);

  const slug = slugMatch[1];
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: course } = await admin.from('courses').select('title, description, cover_image, price_vnd').eq('slug', slug).eq('status', 'published').maybeSingle();

  if (!course) return fetch(request);

  // Fetch the original HTML
  const response = await fetch(request);
  const html = await response.text();

  const title = `${course.title} — sLearning Kaka`;
  const description = (course.description as string)?.slice(0, 160) ?? 'Khoá học trực tuyến trên sLearning Kaka';
  const image = (course.cover_image as string) ?? `${SITE_URL}/og.png`;

  // Inject meta tags
  const injected = html
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${title}">`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${description}">`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${description}">`)
    .replace('</head>', `
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="${SITE_URL}/courses/${slug}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${image}">
    <link rel="canonical" href="${SITE_URL}/courses/${slug}">
    </head>`);

  return new Response(injected, { headers: { ...Object.fromEntries(response.headers), 'content-type': 'text/html; charset=utf-8' } });
}
