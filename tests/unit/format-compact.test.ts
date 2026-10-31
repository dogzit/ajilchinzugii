import { describe, expect, it } from 'vitest';
import { formatCompact } from '../../src/lib/format';

describe('shortening a headline figure', () => {
  it('leaves anything under a million alone', () => {
    expect(formatCompact(128, 'mn')).toBe('128');
    expect(formatCompact(999_999, 'en')).toBe('999,999');
  });

  it('shortens millions', () => {
    expect(formatCompact(48_600_000, 'mn')).toBe('48.6 сая');
    expect(formatCompact(48_600_000, 'en')).toBe('48.6M');
  });

  it('drops a trailing zero rather than printing 50.0', () => {
    expect(formatCompact(50_000_000, 'en')).toBe('50M');
    expect(formatCompact(50_000_000, 'mn')).toBe('50 сая');
  });

  it('shortens billions', () => {
    expect(formatCompact(2_400_000_000, 'mn')).toBe('2.4 тэрбум');
    expect(formatCompact(2_400_000_000, 'en')).toBe('2.4B');
  });

  it('keeps a negative figure negative', () => {
    expect(formatCompact(-3_200_000, 'en')).toBe('-3.2M');
  });
});
