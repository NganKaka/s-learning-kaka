import { describe, it, expect } from 'vitest';
import { generateCertificatePdf } from './certificate';

// Smoke tests: assert the client-side PDF generator produces a structurally
// valid, non-trivial PDF. We don't assert pixel/text layout (brittle), only
// that pdf-lib runs end-to-end and emits real PDF bytes.

const PDF_MAGIC = '%PDF';

function leadingAscii(bytes: Uint8Array, n: number): string {
  return String.fromCharCode(...bytes.slice(0, n));
}

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

  // KNOWN PRE-EXISTING BUG (characterized, not fixed in this behavior-preserving
  // refactor): the standard Helvetica font embeds as WinAnsi, which cannot encode
  // Vietnamese diacritics outside Latin-1 (e.g. "ễ", "ữ"). Certificate generation
  // therefore THROWS for many real Vietnamese student names. Fix requires embedding
  // a Unicode TTF via @pdf-lib/fontkit. When fixed, update this test to assert success.
  it('currently throws on Vietnamese names with non-Latin-1 diacritics (known bug)', async () => {
    await expect(
      generateCertificatePdf({
        studentName: 'Nguyễn Văn Anh',
        courseTitle: 'Toán 12',
        completionDate: new Date('2026-06-09T00:00:00.000Z'),
      }),
    ).rejects.toThrow(/cannot encode/i);
  });
});
