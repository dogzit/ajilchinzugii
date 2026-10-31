import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button, ButtonLink } from '../../src/components/ui/button';
import { SectionHeader } from '../../src/components/ui/section-header';
import { Icon } from '../../src/components/ui/icon';

describe('buttons', () => {
  it('is a link when it goes somewhere and a button when it does something', () => {
    const { unmount } = render(<ButtonLink href="/mn/impact">Нөлөөлөл</ButtonLink>);
    expect(screen.getByRole('link', { name: 'Нөлөөлөл' })).toHaveAttribute(
      'href',
      '/mn/impact',
    );
    unmount();

    render(<Button>Хуулах</Button>);
    expect(screen.getByRole('button', { name: 'Хуулах' })).toHaveAttribute(
      'type',
      'button',
    );
  });

  it('opens an outside link safely', () => {
    render(
      <ButtonLink href="https://example.org" external>
        Гадна
      </ButtonLink>,
    );
    const link = screen.getByRole('link', { name: 'Гадна' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('gives the honey fill an edge, because honey on cream is only 2:1', () => {
    render(<ButtonLink href="/x">Хандив</ButtonLink>);
    expect(screen.getByRole('link')).toHaveClass('border-accent-mark');
  });

  it('meets the 44px target, and 52px when it leads', () => {
    const { unmount } = render(<ButtonLink href="/x">Жижиг</ButtonLink>);
    expect(screen.getByRole('link')).toHaveClass('min-h-11');
    unmount();

    render(
      <ButtonLink href="/x" size="lg">
        Том
      </ButtonLink>,
    );
    expect(screen.getByRole('link')).toHaveClass('min-h-13');
  });

  it('puts the arrow after the label, hidden from a screen reader', () => {
    render(
      <ButtonLink href="/x" trailingArrow>
        Цааш
      </ButtonLink>,
    );
    // The accessible name is the words alone; the arrow is decoration.
    expect(screen.getByRole('link', { name: 'Цааш' })).toBeInTheDocument();
  });
});

describe('a section header', () => {
  it('ties the heading to the band that is labelled by it', () => {
    render(<SectionHeader id="figures" eyebrow="ТОО" title="Нөлөөлөл" lead="Тайлбар" />);
    expect(screen.getByRole('heading', { name: 'Нөлөөлөл' })).toHaveAttribute(
      'id',
      'figures',
    );
    expect(screen.getByText('ТОО')).toBeInTheDocument();
    expect(screen.getByText('Тайлбар')).toBeInTheDocument();
  });

  it('leaves out the eyebrow and the lead when there are none', () => {
    render(<SectionHeader id="plain" title="Гарчиг" />);
    expect(screen.getByRole('heading', { name: 'Гарчиг' })).toBeInTheDocument();
  });
});

describe('icons', () => {
  it('are decoration, never content', () => {
    const { container } = render(<Icon name="shield" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
  });
});
