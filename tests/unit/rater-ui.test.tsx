import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EvidenceQuote } from '../../src/components/ui/evidence-quote';
import { FileDrop } from '../../src/components/ui/file-drop';
import { ScoreGauge } from '../../src/components/ui/score-gauge';
import { Stepper } from '../../src/components/ui/stepper';
import { VerdictBadge } from '../../src/components/ui/verdict-badge';

describe('VerdictBadge', () => {
  it('says the verdict in words, in ink, with its own icon shape', () => {
    const { container } = render(<VerdictBadge verdict="red" label="Улаан" />);
    expect(screen.getByText('Улаан')).toHaveClass('text-ink');
    expect(container.querySelector('[data-verdict="red"] svg')).not.toBeNull();
  });

  it('draws a different shape for each verdict', () => {
    const shapes = (['red', 'yellow', 'green'] as const).map((verdict) => {
      const { container, unmount } = render(<VerdictBadge verdict={verdict} label={verdict} />);
      const html = container.querySelector('svg')?.innerHTML;
      unmount();
      return html;
    });
    expect(new Set(shapes).size).toBe(3);
  });
});

describe('ScoreGauge', () => {
  it('shows the number as text in ink, with the verdict word', () => {
    render(<ScoreGauge score={24} verdict="red" verdictLabel="Улаан" outOf="100-аас" />);
    expect(screen.getByText('24')).toHaveClass('text-ink');
    expect(screen.getByText('Улаан')).toBeInTheDocument();
    expect(screen.getByText('100-аас')).toBeInTheDocument();
  });

  it('clamps to 1–100', () => {
    const { container } = render(
      <ScoreGauge score={140} verdict="green" verdictLabel="Ногоон" outOf="/100" />,
    );
    expect(container.querySelector('[data-score]')).toHaveAttribute('data-score', '100');
  });

  it('colours the arc from tokens, never a hex', () => {
    const { container } = render(
      <ScoreGauge score={50} verdict="yellow" verdictLabel="Шар" outOf="/100" />,
    );
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });
});

describe('Stepper', () => {
  it('states the position in words', () => {
    render(<Stepper current={6} total={15} label="Асуулт 6 / 15" />);
    expect(screen.getByText('Асуулт 6 / 15')).toBeInTheDocument();
  });
});

describe('EvidenceQuote', () => {
  it('quotes the excerpt as written', () => {
    render(<EvidenceQuote excerpt="сарын цалин 450,000 төгрөг" source="Гэрээнээс" />);
    expect(screen.getByText('«сарын цалин 450,000 төгрөг»')).toBeInTheDocument();
  });
});

describe('FileDrop', () => {
  it('is a real file input with a name, and hands the file on', () => {
    const onFile = vi.fn();
    render(<FileDrop accept="image/*" title="Зураг сонгох" onFile={onFile} />);
    const input = screen.getByLabelText('Зураг сонгох');
    expect(input).toHaveAttribute('type', 'file');
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFile).toHaveBeenCalledWith(file);
  });
});
