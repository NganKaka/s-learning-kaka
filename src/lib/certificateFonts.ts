import { type PDFDocument, type PDFFont, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export interface CertificateFonts {
  regular: PDFFont;
  bold: PDFFont;
  oblique: PDFFont;
}

// Be Vietnam Pro covers the full Vietnamese character set (unlike the standard
// WinAnsi Helvetica, which throws on diacritics like "ễ"/"ữ"). Served as static
// assets from /public/fonts so the bundle stays lean and the font is fetched
// lazily only when a certificate is generated.
const FONT_BASE = '/fonts';
const FONT_FILES = {
  regular: 'BeVietnamPro-Regular.ttf',
  bold: 'BeVietnamPro-Bold.ttf',
  italic: 'BeVietnamPro-Italic.ttf',
} as const;

let bytesCache: { regular: Uint8Array; bold: Uint8Array; italic: Uint8Array } | null = null;

async function fetchFontBytes(file: string): Promise<Uint8Array> {
  const res = await fetch(`${FONT_BASE}/${file}`);
  if (!res.ok) throw new Error(`Failed to load font ${file}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function loadFontBytes() {
  if (bytesCache) return bytesCache;
  const [regular, bold, italic] = await Promise.all([
    fetchFontBytes(FONT_FILES.regular),
    fetchFontBytes(FONT_FILES.bold),
    fetchFontBytes(FONT_FILES.italic),
  ]);
  bytesCache = { regular, bold, italic };
  return bytesCache;
}

/**
 * Embed the Vietnamese-capable certificate fonts into a PDF document.
 *
 * Falls back to standard Helvetica (ASCII-only) if the webfont can't be
 * fetched, so generation still works for Latin-only names when offline rather
 * than hard-failing. With the Unicode font present, Vietnamese names render
 * correctly — fixing the prior crash on diacritics outside Latin-1.
 */
export async function embedCertificateFonts(pdf: PDFDocument): Promise<CertificateFonts> {
  try {
    pdf.registerFontkit(fontkit);
    const bytes = await loadFontBytes();
    // .slice() hands each embed a fresh copy so the cached buffers stay reusable
    // across repeated certificate generations.
    return {
      regular: await pdf.embedFont(bytes.regular.slice()),
      bold: await pdf.embedFont(bytes.bold.slice()),
      oblique: await pdf.embedFont(bytes.italic.slice()),
    };
  } catch (err) {
    console.error('[certificate] Unicode font load failed, falling back to Helvetica:', err);
    return {
      regular: await pdf.embedFont(StandardFonts.Helvetica),
      bold: await pdf.embedFont(StandardFonts.HelveticaBold),
      oblique: await pdf.embedFont(StandardFonts.HelveticaOblique),
    };
  }
}
