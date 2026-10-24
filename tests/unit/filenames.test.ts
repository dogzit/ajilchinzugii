import { describe, expect, it } from 'vitest';
import { anonymiseFileName, fileExtension, randomSlug } from '../../src/lib/filenames';

describe('anonymised file names', () => {
  it('drops the original name and keeps the extension', () => {
    expect(anonymiseFileName('Bolormaa-school-photo.JPG', () => 'a1b2c3')).toBe(
      'a1b2c3.jpg',
    );
  });

  it('keeps nothing of a name that could identify a minor', () => {
    const result = anonymiseFileName('13-nastai-bolormaa-ajil.png', () => 'deadbeef');
    expect(result).toBe('deadbeef.png');
    expect(result.toLowerCase()).not.toContain('bolormaa');
  });

  it('accepts pdf for papers', () => {
    expect(anonymiseFileName('report.pdf', () => 'ff00')).toBe('ff00.pdf');
  });

  it('refuses svg and other unsupported types', () => {
    expect(() => anonymiseFileName('logo.svg')).toThrow(/unsupported file type/);
    expect(() => anonymiseFileName('archive.zip')).toThrow(/unsupported file type/);
    expect(() => anonymiseFileName('noextension')).toThrow(/unsupported file type/);
  });

  it('reads the extension case-insensitively', () => {
    expect(fileExtension('a.WEBP')).toBe('webp');
    expect(fileExtension('a.svg')).toBeNull();
  });

  it('produces a random hex slug of the requested length', () => {
    expect(randomSlug(8)).toMatch(/^[0-9a-f]{16}$/);
    expect(randomSlug(4)).not.toBe(randomSlug(4));
  });
});
