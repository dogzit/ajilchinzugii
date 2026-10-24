import { PDFDocument, PDFName } from 'pdf-lib';

/**
 * Removes every metadata field from a PDF.
 *
 * A PDF carries an Info dictionary and an XMP packet that survive an upload
 * untouched: a report exported from Word or Pages keeps the author's name, and
 * the keywords can hold anything the author typed. CLAUDE.md rule 4 allows no
 * minor's data anywhere, metadata included, so the file is rewritten before it
 * reaches storage.
 */
export async function stripPdfMetadata(data: Buffer | Uint8Array): Promise<Buffer> {
  // Normalise to a plain Uint8Array: pdf-lib checks `instanceof Uint8Array`,
  // and a Node Buffer fails that check when the realms differ (jsdom, workers).
  // `updateMetadata: false` stops pdf-lib from writing its own Producer and
  // ModDate back into the file.
  const pdf = await PDFDocument.load(new Uint8Array(data), { updateMetadata: false });

  pdf.setTitle('');
  pdf.setAuthor('');
  pdf.setSubject('');
  pdf.setKeywords([]);
  pdf.setProducer('');
  pdf.setCreator('');

  // The Info dictionary is not the only copy — XMP holds a second one.
  pdf.catalog.delete(PDFName.of('Metadata'));

  const stripped = await pdf.save({ useObjectStreams: false });
  return Buffer.from(stripped);
}
