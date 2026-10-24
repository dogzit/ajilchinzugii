import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The real hook needs Payload's form providers; the counter only reads a value.
const value = { current: '' };
vi.mock('@payloadcms/ui', () => ({
  useField: () => ({ value: value.current }),
}));

const { MetaCharCount } = await import('../../src/payload/components/MetaCharCount');

describe('MetaCharCount', () => {
  it('shows the count and the limit, with a space before the unit', () => {
    value.current = 'Ажилчин Зөгий';
    const { container } = render(
      <MetaCharCount path="seo.metaTitle" field={{ maxLength: 60 }} />,
    );
    // A missing space ("13/60тэмдэгт") is the bug this test guards against.
    expect(container.textContent).toBe('13/60 тэмдэгт / characters');
  });

  it('warns once the text is over the limit', () => {
    value.current = 'x'.repeat(61);
    render(<MetaCharCount path="seo.metaTitle" field={{ maxLength: 60 }} />);
    expect(
      screen.getByText(/61\/60 тэмдэгт \/ characters — хэт урт \/ too long/),
    ).toBeInTheDocument();
  });

  it('counts an empty field as zero rather than rendering nothing', () => {
    value.current = '';
    const { container } = render(
      <MetaCharCount path="seo.metaDescription" field={{ maxLength: 160 }} />,
    );
    expect(container.textContent).toBe('0/160 тэмдэгт / characters');
  });
});
