import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SiteWordmark } from '../../src/components/site-wordmark';
import type { Media } from '../../src/payload-types';

const logo = (overrides: Partial<Media> = {}): Media =>
  ({
    id: 1,
    url: '/api/media/file/logo.webp',
    width: 480,
    height: 120,
    alt: { mn: 'Ажилчин Зөгий лого', en: 'Ajilchin Zogii logo' },
    ...overrides,
  }) as Media;

describe('the wordmark', () => {
  it('sets the name in type when no logo has been uploaded', () => {
    render(<SiteWordmark logo={null} name="Ажилчин Зөгий" />);
    expect(screen.getByText('Ажилчин Зөгий')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('keeps the name beside the logo', () => {
    // The mark is a glyph, not a wordmark: on its own it names nothing.
    render(<SiteWordmark logo={logo()} name="Ажилчин Зөгий" />);
    expect(screen.getByText('Ажилчин Зөгий')).toBeInTheDocument();
    expect(screen.getByRole('presentation')).toBeInTheDocument();
  });

  it('leaves the logo decorative, because the name is already there', () => {
    // Alt text on the image would have the link read the name twice.
    render(<SiteWordmark logo={logo()} name="Ажилчин Зөгий" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('presentation')).toHaveAttribute('alt', '');
  });

  it('keeps its height and lets the width follow the file', () => {
    render(<SiteWordmark logo={logo()} name="Ажилчин Зөгий" />);
    const image = screen.getByRole('presentation');
    // 480x120 at 28px tall is 112px wide; the header never shifts.
    expect(image).toHaveAttribute('height', '28');
    expect(image).toHaveAttribute('width', '112');
  });

  it('is unreferenced when the upload has not been resolved', () => {
    render(<SiteWordmark logo={7} name="Ажилчин Зөгий" />);
    expect(screen.getByText('Ажилчин Зөгий')).toBeInTheDocument();
  });
});
