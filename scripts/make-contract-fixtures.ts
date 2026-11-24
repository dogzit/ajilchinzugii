/**
 * Builds the PDF and Word fixtures in tests/fixtures/contracts/ from their
 * .txt sources, so the extraction tests and the eval read real file formats.
 * Run: node scripts/make-contract-fixtures.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import fontkit from '@pdf-lib/fontkit';
import { strToU8, zipSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';

const DIR = 'tests/fixtures/contracts';
const font = /ONEST_REGULAR = "([^"]+)"/.exec(readFileSync('src/lib/rater/fonts/onest.generated.ts', 'utf8'))?.[1] ?? '';

async function pdf(name: string) {
  const lines = readFileSync(`${DIR}/${name}.txt`, 'utf8').split('\n');
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setProducer('');
  doc.setCreator('');
  const regular = await doc.embedFont(Buffer.from(font, 'base64'), { subset: true });
  const page = doc.addPage([595, 842]);
  let y = 790;
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 10, font: regular });
    y -= 16;
  }
  writeFileSync(`${DIR}/${name}.pdf`, await doc.save());
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function docx(name: string) {
  const paragraphs = readFileSync(`${DIR}/${name}.txt`, 'utf8')
    .split('\n')
    .map((line) => `<w:p><w:r><w:t xml:space="preserve">${escape(line)}</w:t></w:r></w:p>`)
    .join('');
  const files = {
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    ),
    'word/document.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}</w:body></w:document>`,
    ),
  };
  // A fixed timestamp, so regenerating does not change the bytes.
  writeFileSync(`${DIR}/${name}.docx`, zipSync(files, { mtime: new Date('2026-01-01T00:00:00Z') }));
}

await pdf('06-tutoring');
await pdf('08-internship');
docx('07-summer-job');
docx('09-service-contract');
console.log('fixtures written');
