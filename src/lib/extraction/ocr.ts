/**
 * OCR in the browser (ADR §2). The photo never leaves the phone: tesseract.js
 * reads it with the Mongolian model, from files this site serves itself
 * (public/ocr/, no CDN), loaded only when the reader picks a photo. The
 * server gets text, never an image.
 *
 * Behind `OcrEngine` so a cloud engine can replace it after the spec's OCR
 * benchmark without touching anything else.
 */

export type OcrResult = { text: string; confidence: number };

export interface OcrEngine {
  recognize(image: Blob, onProgress?: (fraction: number) => void): Promise<OcrResult>;
}

/** Below this mean word confidence (0–100) the reader is sent to the questionnaire instead (spec). */
export const MIN_OCR_CONFIDENCE = 60;

export const tesseractEngine: OcrEngine = {
  async recognize(image, onProgress) {
    const { createWorker, OEM } = await import('tesseract.js');
    const worker = await createWorker('mon', OEM.LSTM_ONLY, {
      workerPath: '/ocr/worker.min.js',
      corePath: '/ocr/core',
      langPath: '/ocr/lang',
      gzip: true,
      workerBlobURL: false,
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') onProgress?.(m.progress);
      },
    });
    try {
      const { data } = await worker.recognize(image);
      return { text: data.text, confidence: data.confidence };
    } finally {
      await worker.terminate();
    }
  },
};

/**
 * The engine in use. End-to-end tests install a stand-in on
 * `window.__AZ_OCR__` (Playwright's addInitScript) so they do not depend on
 * reading a real photo; nothing else ever sets it.
 */
export function ocrEngine(): OcrEngine {
  return (globalThis as { __AZ_OCR__?: OcrEngine }).__AZ_OCR__ ?? tesseractEngine;
}
