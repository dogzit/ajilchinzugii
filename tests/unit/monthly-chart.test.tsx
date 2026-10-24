import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { MonthlyChart } from '../../src/components/monthly-chart';
import messages from '../../messages/mn.json';
import type { ImpactMonthlyPoint } from '../../src/lib/impact/suppress';

const point = (
  month: string,
  value: number | null,
  suppressed = false,
): ImpactMonthlyPoint => ({
  month,
  metricId: 'cases-resolved',
  value,
  suppressed,
  nCases: suppressed ? null : 10,
});

const points = [
  point('2026-06', 10),
  point('2026-07', 14),
  point('2026-08', null, true), // withheld: fewer than five cases
  point('2026-09', 27),
];

function draw(data = points) {
  return render(
    <NextIntlClientProvider locale="mn" messages={messages}>
      <MonthlyChart points={data} label="Шийдвэрлэсэн хэрэг" locale="mn" />
    </NextIntlClientProvider>,
  );
}

describe('a withheld month is a gap, not a zero', () => {
  it('breaks the line into two runs around the gap', () => {
    const { container } = draw();
    const lines = container.querySelectorAll('polyline');

    expect(lines).toHaveLength(1);
    // June–July on one side of the gap; September is alone and so has no line.
    expect(lines[0]?.getAttribute('points')?.split(' ')).toHaveLength(2);
  });

  it('plots a marker for every shown month and none for the withheld one', () => {
    const { container } = draw();
    expect(container.querySelectorAll('circle')).toHaveLength(3);
  });

  it('never places a point at zero for the withheld month', () => {
    const { container } = draw();
    const baseline = 16 + 190; // chart top + plot height, where a zero would sit
    const ys = [...container.querySelectorAll('circle')].map((c) =>
      Number(c.getAttribute('cy')),
    );
    expect(ys.some((y) => Math.abs(y - baseline) < 0.5)).toBe(false);
  });

  it('keeps two separate runs when the gap sits between longer stretches', () => {
    const { container } = draw([
      point('2026-05', 4),
      point('2026-06', 10),
      point('2026-07', null, true),
      point('2026-08', 14),
      point('2026-09', 27),
    ]);
    expect(container.querySelectorAll('polyline')).toHaveLength(2);
  });
});

describe('the chart is readable without seeing it', () => {
  it('is an image with a text summary naming the withheld months', () => {
    draw();
    const figure = screen.getByRole('img');
    const label = figure.getAttribute('aria-label') ?? '';

    expect(label).toContain('Шийдвэрлэсэн хэрэг');
    expect(label).toContain('2026 оны 6 сар');
    expect(label).toContain('2026 оны 9 сар');
    expect(label).toContain('1');
  });

  it('carries the same numbers as a real table', () => {
    draw();
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);

    expect(rows).toHaveLength(4);
    expect(rows[2]?.textContent).toContain('5-аас цөөн');
    expect(rows[3]?.textContent).toContain('27');
  });

  it('explains the gap in words when there is one', () => {
    draw();
    expect(screen.getByText(/Тасарсан хэсэг/)).toBeInTheDocument();
  });

  it('says nothing about gaps when every month is shown', () => {
    draw([point('2026-08', 14), point('2026-09', 27)]);
    expect(screen.queryByText(/Тасарсан хэсэг/)).not.toBeInTheDocument();
  });

  it('renders nothing at all without months', () => {
    const { container } = draw([]);
    expect(container.firstChild).toBeNull();
  });
});
