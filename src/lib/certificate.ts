import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface CertificateInput {
  studentName: string;
  courseTitle: string;
  completionDate: Date;
  instructorName?: string;
}

/**
 * Generates a PDF certificate client-side. Lazy-loaded by the dashboard
 * since pdf-lib is ~250 KB. Only fires when a student clicks the download
 * button after completing every lesson in a course.
 */
export async function generateCertificatePdf(input: CertificateInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]); // A4 landscape
  const { width, height } = page.getSize();

  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdf.embedFont(StandardFonts.HelveticaOblique);

  // Background
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.051, 0.106, 0.165),
  });

  // Outer border
  page.drawRectangle({
    x: 28,
    y: 28,
    width: width - 56,
    height: height - 56,
    borderColor: rgb(0.914, 0.765, 0.286),
    borderWidth: 1,
  });

  // Inner border
  page.drawRectangle({
    x: 38,
    y: 38,
    width: width - 76,
    height: height - 76,
    borderColor: rgb(0.133, 0.827, 0.933),
    borderWidth: 0.5,
  });

  // Top label
  drawCenteredText(page, 'sLEARNINGKAKA', helveticaBold, 16, height - 90, rgb(0.914, 0.765, 0.286));
  drawCenteredText(page, 'CERTIFICATE OF COMPLETION', helvetica, 11, height - 110, rgb(0.733, 0.788, 0.815));

  // Decorative line
  page.drawLine({
    start: { x: width / 2 - 60, y: height - 130 },
    end: { x: width / 2 + 60, y: height - 130 },
    thickness: 0.8,
    color: rgb(0.914, 0.765, 0.286),
  });

  // Body
  drawCenteredText(page, 'This is to certify that', helveticaOblique, 16, height - 200, rgb(0.733, 0.788, 0.815));
  drawCenteredText(page, input.studentName, helveticaBold, 36, height - 250, rgb(0.882, 0.886, 0.906));

  // Underline below name
  const nameWidth = helveticaBold.widthOfTextAtSize(input.studentName, 36);
  page.drawLine({
    start: { x: width / 2 - nameWidth / 2 - 10, y: height - 265 },
    end: { x: width / 2 + nameWidth / 2 + 10, y: height - 265 },
    thickness: 0.7,
    color: rgb(0.914, 0.765, 0.286),
    opacity: 0.7,
  });

  drawCenteredText(page, 'has successfully completed the course', helveticaOblique, 14, height - 305, rgb(0.733, 0.788, 0.815));
  drawCenteredText(page, input.courseTitle, helveticaBold, 22, height - 345, rgb(0.133, 0.827, 0.933));

  // Footer block: date + signature
  const dateStr = input.completionDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const dateY = 110;

  // Left: date
  page.drawText('DATE OF COMPLETION', {
    x: 100,
    y: dateY + 22,
    size: 8,
    font: helvetica,
    color: rgb(0.6, 0.65, 0.7),
  });
  page.drawText(dateStr, {
    x: 100,
    y: dateY,
    size: 14,
    font: helveticaBold,
    color: rgb(0.882, 0.886, 0.906),
  });
  page.drawLine({
    start: { x: 100, y: dateY - 8 },
    end: { x: 280, y: dateY - 8 },
    thickness: 0.5,
    color: rgb(0.6, 0.65, 0.7),
  });

  // Right: instructor
  const instructorName = input.instructorName ?? 'Vo Hoang Ngan';
  page.drawText('INSTRUCTOR', {
    x: width - 280,
    y: dateY + 22,
    size: 8,
    font: helvetica,
    color: rgb(0.6, 0.65, 0.7),
  });
  page.drawText(instructorName, {
    x: width - 280,
    y: dateY,
    size: 14,
    font: helveticaBold,
    color: rgb(0.882, 0.886, 0.906),
  });
  page.drawLine({
    start: { x: width - 280, y: dateY - 8 },
    end: { x: width - 100, y: dateY - 8 },
    thickness: 0.5,
    color: rgb(0.6, 0.65, 0.7),
  });

  // Bottom flair
  drawCenteredText(page, 'Built with care, in HCMC', helveticaOblique, 9, 60, rgb(0.5, 0.55, 0.6));

  return pdf.save();
}

function drawCenteredText(
  page: ReturnType<PDFDocument['addPage']>,
  text: string,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  size: number,
  y: number,
  color: ReturnType<typeof rgb>,
) {
  const w = font.widthOfTextAtSize(text, size);
  const x = (page.getWidth() - w) / 2;
  page.drawText(text, { x, y, size, font, color });
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
