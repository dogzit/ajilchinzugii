import { strFromU8, unzipSync } from 'fflate';

/**
 * File → text, on the server, in memory. PDF through unpdf (pdf.js built for
 * serverless runtimes); DOCX by unzipping the file and reading the paragraph
 * text out of word/document.xml — a DOCX is a ZIP of XML, and nothing more is
 * needed to get its words. No native code, no temp files: the bytes and the
 * text are dropped when the request ends.
 *
 * Images are never sent here: they are read on the phone (ocr.ts).
 */

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_PAGES = 10;
/** About ten dense pages; DOCX has no page count to check. */
export const MAX_TEXT_CHARS = 60_000;

export class ExtractionError extends Error {
  constructor(
    public readonly code:
      | 'too_large'
      | 'too_many_pages'
      | 'unsupported_type'
      | 'unreadable'
      | 'no_text'
      | 'llm_unavailable'
      | 'invalid_output',
  ) {
    super(code);
  }
}

export type DocumentText = { text: string; pages: number };

export async function pdfText(bytes: Uint8Array): Promise<DocumentText> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  let pdf;
  try {
    pdf = await getDocumentProxy(bytes);
  } catch {
    throw new ExtractionError('unreadable');
  }
  if (pdf.numPages > MAX_PAGES) throw new ExtractionError('too_many_pages');
  const { text, totalPages } = await extractText(pdf, { mergePages: false });
  return { text: (text as string[]).map((page, i) => `[${i + 1}]\n${page}`).join('\n\n'), pages: totalPages };
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export function docxText(bytes: Uint8Array): DocumentText {
  let files;
  try {
    files = unzipSync(bytes, { filter: (file) => file.name === 'word/document.xml' });
  } catch {
    throw new ExtractionError('unreadable');
  }
  const xml = files['word/document.xml'];
  if (!xml) throw new ExtractionError('unreadable');
  const text = strFromU8(xml)
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br[^>]*\/>|<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (match, entity: string) => {
      if (entity.startsWith('#x')) return String.fromCodePoint(parseInt(entity.slice(2), 16));
      if (entity.startsWith('#')) return String.fromCodePoint(Number(entity.slice(1)));
      return ENTITIES[entity] ?? match;
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const breaks = (strFromU8(xml).match(/w:type="page"/g) ?? []).length;
  return { text, pages: breaks + 1 };
}

const PDF = 'application/pdf';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export async function fileText(file: File): Promise<DocumentText> {
  if (file.size > MAX_FILE_BYTES) throw new ExtractionError('too_large');
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Trust the bytes, not the name: %PDF- or a ZIP header.
  const isPdf = file.type === PDF || (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46);
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const result = isPdf ? await pdfText(bytes) : isZip && (file.type === DOCX || file.name.endsWith('.docx') || !file.type) ? docxText(bytes) : null;
  if (!result) throw new ExtractionError('unsupported_type');
  if (result.pages > MAX_PAGES) throw new ExtractionError('too_many_pages');
  return result;
}
