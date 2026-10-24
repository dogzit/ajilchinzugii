import { ImageResponse } from 'next/og';

/**
 * The share image for a page, drawn on the fly.
 *
 * The site's type is Cyrillic, and satori ships no font, so IBM Plex Sans is
 * fetched from Google's font host once per process. If that fetch fails the
 * image is still drawn, in the shapes and colours only — a share card without
 * a title beats a broken request, and nothing on the page depends on it.
 */

export const runtime = 'nodejs';
export const revalidate = 604_800; // a week: the image changes only with its title

const WIDTH = 1200;
const HEIGHT = 630;

// The design tokens, as literal values: satori resolves no CSS variables.
const INK = '#14120f';
const INK_SOFT = '#3a352d';
const INK_MUTED = '#5c564b';
const BG = '#fbfaf8';
const ACCENT = '#b06e07';
const BORDER = '#e0d9cc';

type FontSet = { name: string; data: ArrayBuffer; weight: 400 | 600 }[];

let fontsPromise: Promise<FontSet | null> | null = null;

/** Resolves a Google font to its actual file, then downloads it. */
async function loadFont(family: string, weight: 400 | 600): Promise<ArrayBuffer | null> {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`,
    { next: { revalidate: 2_592_000 } },
  );
  if (!css.ok) return null;

  // Without a modern user agent Google answers with plain TTF, which satori
  // reads directly — no woff2 decoding needed.
  const url = (await css.text()).match(/src:\s*url\((https:[^)]+\.ttf)\)/)?.[1];
  if (!url) return null;

  const file = await fetch(url, { next: { revalidate: 2_592_000 } });
  return file.ok ? await file.arrayBuffer() : null;
}

async function fonts(): Promise<FontSet | null> {
  fontsPromise ??= (async () => {
    try {
      const [regular, semibold] = await Promise.all([
        loadFont('IBM Plex Sans', 400),
        loadFont('IBM Plex Sans', 600),
      ]);
      if (!regular || !semibold) return null;
      return [
        { name: 'Plex', data: regular, weight: 400 },
        { name: 'Plex', data: semibold, weight: 600 },
      ];
    } catch {
      return null;
    }
  })();

  return fontsPromise;
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const title = (params.get('title') ?? '').slice(0, 120);
  const subtitle = (params.get('subtitle') ?? '').slice(0, 90);
  const locale = params.get('locale') === 'en' ? 'en' : 'mn';
  const eyebrow = locale === 'en' ? 'Ajilchin Zögii' : 'Ажилчин Зөгий';

  const loaded = await fonts();

  // Without a font, satori cannot draw a single glyph — so the fallback card
  // carries the mark and the accent rule, and no text at all.
  if (!loaded) {
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 48,
          background: BG,
        }}
      >
        <svg width="160" height="160" viewBox="0 0 24 24">
          <path
            d="M12 1.5 21.5 7v10L12 22.5 2.5 17V7z"
            fill="none"
            stroke={ACCENT}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
        <div style={{ display: 'flex', height: 8, width: 320, background: ACCENT }} />
      </div>,
      { width: WIDTH, height: HEIGHT },
    );
  }

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: BG,
        padding: '72px 80px',
        fontFamily: 'Plex',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* The one motif: a honeycomb cell. */}
        <svg width="40" height="40" viewBox="0 0 24 24">
          <path
            d="M12 1.5 21.5 7v10L12 22.5 2.5 17V7z"
            fill="none"
            stroke={ACCENT}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
        <div style={{ fontSize: 30, color: INK_SOFT, fontWeight: 600 }}>{eyebrow}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ fontSize: 68, lineHeight: 1.1, color: INK, fontWeight: 600 }}>
          {title}
        </div>
        {subtitle ? (
          <div style={{ fontSize: 30, color: INK_MUTED }}>{subtitle}</div>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          borderTop: `2px solid ${BORDER}`,
          paddingTop: 24,
          fontSize: 24,
          color: INK_MUTED,
        }}
      >
        {locale === 'en'
          ? 'Labour rights of working children and teens'
          : 'Хөдөлмөр эрхэлж байгаа хүүхэд, залуучуудын хөдөлмөрийн эрх'}
      </div>
    </div>,
    { width: WIDTH, height: HEIGHT, fonts: loaded },
  );
}
