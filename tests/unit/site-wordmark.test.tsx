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
    render(<SiteWordmark logo={null} name="Ажилчин Зөгий" locale="mn" />);
    expect(screen.getByText('Ажилчин Зөгий')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the uploaded logo instead', () => {
    render(<SiteWordmark logo={logo()} name="Ажилчин Зөгий" locale="mn" />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Ажилчин Зөгий лого');
  });

  it('falls back to the organisation name when the alt text is empty', () => {
    render(
      <SiteWordmark
        logo={logo({ alt: { mn: '   ', en: '' } } as Partial<Media>)}
        name="Ажилчин Зөгий"
        locale="mn"
      />,
    );
    // A logo that leaves the link to the front page unnamed is worse than none.
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Ажилчин Зөгий');
  });

  it('takes the alt text of the language being read', () => {
    render(<SiteWordmark logo={logo()} name="Ajilchin Zogii" locale="en" />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Ajilchin Zogii logo');
  });

  it('keeps its height and lets the width follow the file', () => {
    render(<SiteWordmark logo={logo()} name="Ажилчин Зөгий" locale="mn" />);
    const image = screen.getByRole('img');
    // 480x120 at 28px tall is 112px wide; the header never shifts.
    expect(image).toHaveAttribute('height', '28');
    expect(image).toHaveAttribute('width', '112');
  });

  it('is unreferenced when the upload has not been resolved', () => {
    render(<SiteWordmark logo={7} name="Ажилчин Зөгий" locale="mn" />);
    expect(screen.getByText('Ажилчин Зөгий')).toBeInTheDocument();
  });
});
