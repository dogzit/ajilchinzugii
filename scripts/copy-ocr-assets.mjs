/**
 * Self-hosts the browser OCR: copies tesseract.js's worker and the LSTM
 * builds of its WebAssembly core from node_modules into public/ocr/, so the
 * reader's phone never fetches code from a third-party CDN (and the CSP can
 * stay 'self'). The Mongolian model (tessdata_fast `mon`) is committed in
 * public/ocr/lang/. Runs before `dev` and `build`; the copies are gitignored.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const tesseract = dirname(require.resolve('tesseract.js/package.json'));
const core = dirname(require.resolve('tesseract.js-core/package.json', { paths: [tesseract] }));

mkdirSync('public/ocr/core', { recursive: true });
copyFileSync(join(tesseract, 'dist/worker.min.js'), 'public/ocr/worker.min.js');
for (const name of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js']) {
  copyFileSync(join(core, name), join('public/ocr/core', name));
}
console.log('OCR assets copied to public/ocr/');
