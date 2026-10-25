import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/mn.json';
import { CitationBlock } from '../../src/components/citation-block';
import { MetricTile } from '../../src/components/metric-tile';
import type { LocalizedMetric } from '../../src/lib/impact';

const metric = (overrides: Partial<LocalizedMetric> = {}): LocalizedMetric => ({
  metricId: 'cases-resolved',
  label: 'Шийдвэрлэсэн хэрэг',
  value: 128,
  suppressed: false,
  nCases: 128,
  asOf: '2026-09-30',
  methodAnchor: 'counting-cases',
  methodHref: '/mn/methodology#counting-cases',
  showOnHome: true,
  ...overrides,
});

const draw = (value: LocalizedMetric) =>
  render(
    <NextIntlClientProvider locale="mn" messages={messages}>
      <MetricTile metric={value} locale="mn" />
    </NextIntlClientProvider>,
  );

describe('every figure carries its date and its rule', () => {
  it('shows the as-of date', () => {
    draw(metric());
    expect(screen.getByText(/2026 оны 9 сарын 30-ны байдлаар/)).toBeInTheDocument();
  });

  it('links to the counting rule by anchor', () => {
    draw(metric());
    const link = screen.getByRole('link', { name: 'Хэрхэн тоолсон бэ?' });
    expect(link).toHaveAttribute('href', '/mn/methodology#counting-cases');
  });

  it('keeps the date and the rule link on a suppressed figure too', () => {
    draw(metric({ suppressed: true, value: null, nCases: null }));

    expect(screen.getByText('5-аас цөөн')).toBeInTheDocument();
    expect(screen.getByText(/2026 оны 9 сарын 30-ны байдлаар/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Хэрхэн тоолсон бэ?' })).toHaveAttribute(
      'href',
      '/mn/methodology#counting-cases',
    );
  });

  it('never prints the case count of a suppressed figure', () => {
    draw(metric({ suppressed: true, value: null, nCases: null }));
    expect(screen.queryByText(/хэрэг дээр үндэслэв/)).not.toBeInTheDocument();
  });
});

describe('the citation copy buttons', () => {
  const apa = 'Б. Болормаа (2026). Хөдөлмөрийн эрх. Journal. https://doi.org/10.1/x';
  const bibtex = '@article{x-2026,\n  author = {Б. Болормаа}\n}';

  const drawCitation = () =>
    render(
      <NextIntlClientProvider locale="mn" messages={messages}>
        <CitationBlock apa={apa} bibtex={bibtex} />
      </NextIntlClientProvider>,
    );

  // `userEvent.setup()` installs its own clipboard on jsdom, so the spy goes
  // on afterwards or it is replaced before the click happens. The result is a
  // factory, not a promise: a rejected promise built here would sit unhandled
  // until the click, which Node reports as an unhandled rejection.
  const clipboardSpy = (result: () => Promise<void>) => {
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockImplementation(() => result());
    return { user, writeText };
  };

  afterEach(() => vi.restoreAllMocks());

  it('writes the APA string to the clipboard and says so', async () => {
    const { user, writeText } = clipboardSpy(() => Promise.resolve());

    drawCitation();
    await user.click(screen.getByRole('button', { name: /APA/ }));

    expect(writeText).toHaveBeenCalledWith(apa);
    expect(await screen.findByText('Хуулагдлаа')).toBeInTheDocument();
  });

  it('writes the BibTeX entry, newlines and all', async () => {
    const { user, writeText } = clipboardSpy(() => Promise.resolve());

    drawCitation();
    await user.click(screen.getByRole('button', { name: /BibTeX/ }));

    expect(writeText).toHaveBeenCalledWith(bibtex);
    expect(String(writeText.mock.calls[0]?.[0])).toContain('\n');
  });

  it('says it failed rather than pretending it worked', async () => {
    const { user } = clipboardSpy(() => Promise.reject(new Error('denied')));

    drawCitation();
    await user.click(screen.getByRole('button', { name: /APA/ }));

    expect(await screen.findByText('Хуулж чадсангүй')).toBeInTheDocument();
  });

  it('leaves the text selectable, so a copy is possible without the button', () => {
    const { container } = drawCitation();
    expect(container.querySelectorAll('.select-all')).toHaveLength(2);
  });
});
