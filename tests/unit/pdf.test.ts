// @vitest-environment node
import { PDFDocument, PDFName } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { stripPdfMetadata } from '../../src/lib/pdf';

async function pdfWithMetadata(useObjectStreams = true): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.addPage([200, 200]);
  pdf.setTitle('Судалгааны тайлан');
  pdf.setAuthor('Б. Болормаа');
  pdf.setSubject('Хөдөлмөрийн эрх');
  pdf.setKeywords(['13 настай', '3-р сургууль']);
  pdf.setCreator('Pages');
  pdf.setProducer('Pages');
  return Buffer.from(await pdf.save({ useObjectStreams }));
}

describe('stripPdfMetadata', () => {
  it('leaves no author, title, subject or keywords behind', async () => {
    const before = await pdfWithMetadata();
    // The source really does carry the data, otherwise the test proves nothing.
    const source = await PDFDocument.load(before, { updateMetadata: false });
    expect(source.getAuthor()).toBe('Б. Болормаа');
    expect(source.getKeywords()).toContain('3-р сургууль');

    const after = await stripPdfMetadata(before);
    const pdf = await PDFDocument.load(after, { updateMetadata: false });

    expect(pdf.getAuthor()).toBe('');
    expect(pdf.getTitle()).toBe('');
    expect(pdf.getSubject()).toBe('');
    expect(pdf.getKeywords()).toBe('');
    expect(pdf.getProducer()).toBe('');
    expect(pdf.getCreator()).toBe('');
  });

  /**
   * A PDF stores text as UTF-16BE hex (`<FEFF0411...>`), so a byte search for
   * the name finds nothing whether or not it is still in the file. These are
   * decoded before checking.
   */
  const decodedStrings = (pdf: Buffer): string[] =>
    [...pdf.toString('latin1').matchAll(/<(FEFF[0-9A-Fa-f]+)>/g)].map(([, hex]) =>
      Buffer.from(hex as string, 'hex')
        .swap16()
        .toString('utf16le')
        .replace(/^\uFFFE/, ''),
    );

  it('removes every copy of the metadata, including the XMP packet', async () => {
    // Uncompressed, so the dictionaries are readable as plain bytes.
    const before = await pdfWithMetadata(false);
    expect(before.toString('latin1')).toContain('/Author');
    expect(decodedStrings(before).join(' ')).toContain('Болормаа');

    const after = await stripPdfMetadata(before);

    expect(decodedStrings(after).join(' ')).not.toContain('Болормаа');
    expect(decodedStrings(after).join(' ')).not.toContain('сургууль');
    expect(after.toString('latin1')).not.toMatch(/<x:xmpmeta/);

    // The XMP stream is referenced from the catalog; dropping the key is what
    // removes the second copy of the author's name.
    const pdf = await PDFDocument.load(after, { updateMetadata: false });
    expect(pdf.catalog.get(PDFName.of('Metadata'))).toBeUndefined();
  });

  it('keeps the document readable and keeps its pages', async () => {
    const after = await stripPdfMetadata(await pdfWithMetadata());
    const pdf = await PDFDocument.load(after);
    expect(pdf.getPageCount()).toBe(1);
  });
});
