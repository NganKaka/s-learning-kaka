/**
 * JSON-LD structured data for SEO.
 * Renders a <script type="application/ld+json"> tag.
 */
export function CourseJsonLd({ course }: {
  course: { title: string; description?: string | null; price_vnd: number; slug: string; cover_image?: string | null; instructor_name?: string | null };
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description ?? 'Khoá học trực tuyến trên sLearning Kaka',
    provider: { '@type': 'Organization', name: 'sLearning Kaka', url: 'https://s-learning-kaka.vercel.app' },
    url: `https://s-learning-kaka.vercel.app/courses/${course.slug}`,
    image: course.cover_image ?? 'https://s-learning-kaka.vercel.app/og.png',
    offers: { '@type': 'Offer', price: course.price_vnd, priceCurrency: 'VND', availability: 'https://schema.org/InStock' },
    ...(course.instructor_name ? { instructor: { '@type': 'Person', name: course.instructor_name } } : {}),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'sLearning Kaka',
    url: 'https://s-learning-kaka.vercel.app',
    logo: 'https://s-learning-kaka.vercel.app/og.png',
    description: 'Nền tảng học tập trực tuyến cho học sinh Việt Nam',
    sameAs: [],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function BreadcrumbJsonLd({ items }: { items: Array<{ name: string; url: string }> }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
