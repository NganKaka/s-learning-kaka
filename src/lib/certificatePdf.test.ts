import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateCertificatePdf } from './certificatePdf';

// Smoke tests: assert the client-side PDF generator produces a structurally
// valid, non-trivial PDF. We don't assert pixel/text layout (brittle), only
// that pdf-lib runs end-to-end and emits real PDF bytes.

const PDF_MAGIC = '%PDF';
const FONT_DIR = resolve(import.meta.dirname, '../../public/fonts');

function leadingAscii(bytes: Uint8Array, n: number): string {
  return String.fromCharCode(...bytes.slice(0, n));
}

// Mock `fetch` to serve the bundled Be Vietnam Pro TTFs from disk, mirroring how
// the browser fetches them from /public/fonts at runtime.
beforeAll(() => {
  const files: Record<string, Buffer> = {
    'BeVietnamPro-Regular.ttf': readFileSync(resolve(FONT_DIR, 'BeVietnamPro-Regular.ttf')),
    'BeVietnamPro-Bold.ttf': readFileSync(resolve(FONT_DIR, 'BeVietnamPro-Bold.ttf')),
    'BeVietnamPro-Italic.ttf': readFileSync(resolve(FONT_DIR, 'BeVietnamPro-Italic.ttf')),
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const name = url.split('/').pop() ?? '';
      const buf = files[name];
      if (!buf) return { ok: false, status: 404 } as Response;
      return {
        ok: true,
        arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      } as Response;
    }),
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('generateCertificatePdf', () => {
  it('returns a non-empty Uint8Array beginning with the PDF magic header', async () => {
    const bytes = await generateCertificatePdf({
      studentName: 'Nguyen Van A',
      courseTitle: 'Toan 12',
      completionDate: new Date('2026-06-09T00:00:00.000Z'),
    });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(leadingAscii(bytes, 4)).toBe(PDF_MAGIC);
  });

  it('works without an explicit instructor name (uses default)', async () => {
    const bytes = await generateCertificatePdf({
      studentName: 'Student',
      courseTitle: 'Course',
      completionDate: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(leadingAscii(bytes, 4)).toBe(PDF_MAGIC);
  });

  // Regression test for the previously-known bug: Vietnamese names with
  // diacritics outside Latin-1 ("ễ", "ữ") now render correctly because the
  // generator embeds the Unicode Be Vietnam Pro font instead of WinAnsi Helvetica.
  it('renders Vietnamese names with diacritics (no longer throws)', async () => {
    const bytes = await generateCertificatePdf({
      studentName: 'Nguyễn Văn Anh',
      courseTitle: 'Toán 12 — Đại số & Hình học',
      completionDate: new Date('2026-06-09T00:00:00.000Z'),
    });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(leadingAscii(bytes, 4)).toBe(PDF_MAGIC);
  });
});
