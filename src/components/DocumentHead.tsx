import { useEffect } from 'react';

/**
 * Per-page document head updater. Sets title, meta description, and
 * Open Graph + Twitter tags. No external dependency — direct DOM
 * manipulation on mount, restored on unmount.
 */

interface DocumentHeadProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
}

const DEFAULT_IMAGE = '/og.png';

export default function DocumentHead({ title, description, image, url, type = 'website' }: DocumentHeadProps) {
  useEffect(() => {
    const fullTitle = title.includes('sLearningKaka') ? title : `${title} — sLearningKaka`;
    const desc =
      description ??
      'Khoá học chất lượng cho học sinh Việt Nam. Video bài giảng, flashcard ôn tập, quiz đánh giá, chứng chỉ hoàn thành.';
    const img = image ?? DEFAULT_IMAGE;
    const fullUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '');

    const prevTitle = document.title;
    document.title = fullTitle;

    const tags: Array<{ selector: string; attr: 'name' | 'property'; key: string; value: string }> = [
      { selector: 'meta[name="description"]', attr: 'name', key: 'description', value: desc },
      { selector: 'meta[property="og:title"]', attr: 'property', key: 'og:title', value: fullTitle },
      { selector: 'meta[property="og:description"]', attr: 'property', key: 'og:description', value: desc },
      { selector: 'meta[property="og:image"]', attr: 'property', key: 'og:image', value: img },
      { selector: 'meta[property="og:url"]', attr: 'property', key: 'og:url', value: fullUrl },
      { selector: 'meta[property="og:type"]', attr: 'property', key: 'og:type', value: type },
      { selector: 'meta[name="twitter:card"]', attr: 'name', key: 'twitter:card', value: 'summary_large_image' },
      { selector: 'meta[name="twitter:title"]', attr: 'name', key: 'twitter:title', value: fullTitle },
      { selector: 'meta[name="twitter:description"]', attr: 'name', key: 'twitter:description', value: desc },
      { selector: 'meta[name="twitter:image"]', attr: 'name', key: 'twitter:image', value: img },
    ];

    const previousValues: Array<{ el: HTMLMetaElement; prev: string | null; created: boolean }> = [];

    for (const tag of tags) {
      let el = document.head.querySelector<HTMLMetaElement>(tag.selector);
      let created = false;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(tag.attr, tag.key);
        document.head.appendChild(el);
        created = true;
      }
      const prev = el.getAttribute('content');
      el.setAttribute('content', tag.value);
      previousValues.push({ el, prev, created });
    }

    return () => {
      document.title = prevTitle;
      for (const { el, prev, created } of previousValues) {
        if (created) {
          el.remove();
        } else if (prev !== null) {
          el.setAttribute('content', prev);
        }
      }
    };
  }, [title, description, image, url, type]);

  return null;
}
