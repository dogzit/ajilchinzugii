import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';
import { ONEST_REGULAR, ONEST_SEMIBOLD } from './fonts/onest.generated';
import type { TemplateDoc } from './template';

/**
 * The template as an A4 PDF, with Onest embedded (subset) so Mongolian
 * Cyrillic — Ө and Ү included — prints correctly anywhere. Built in memory
 * and returned; nothing is written to disk or kept.
 */

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;
// The document's own ink: warm brown, printed, not a screen token.
const INK = rgb(0.17, 0.13, 0.09);
const MUTED = rgb(0.36, 0.29, 0.22);

const bytes = (base64: string) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function renderTemplatePdf(doc: TemplateDoc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(doc.title);
  pdf.setProducer('');
  pdf.setCreator('');
  const regular = await pdf.embedFont(bytes(ONEST_REGULAR), { subset: true });
  const bold = await pdf.embedFont(bytes(ONEST_SEMIBOLD), { subset: true });
  const width = A4[0] - MARGIN * 2;

  let page = pdf.addPage(A4);
  let y = A4[1] - MARGIN;

  const draw = (text: string, font: PDFFont, size: number, color = INK, gapAfter = 0) => {
    for (const line of wrap(text, font, size, width)) {
      if (y - size * 1.45 < MARGIN) {
        page = pdf.addPage(A4);
        y = A4[1] - MARGIN;
      }
      y -= size * 1.45;
      page.drawText(line, { x: MARGIN, y, size, font, color });
    }
    y -= gapAfter;
  };

  draw(doc.title, bold, 17, INK, 6);
  draw(doc.note, regular, 9.5, MUTED, 14);
  for (const section of doc.sections) {
    draw(section.heading, bold, 12, INK, 4);
    for (const line of section.lines) draw(line, regular, 11, INK, 3);
    y -= 10;
  }

  return pdf.save();
}
