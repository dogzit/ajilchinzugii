import { describe, expect, it } from 'vitest';
import {
  consentErrorMessage,
  hasRequiredConsent,
  missingConsent,
} from '../../src/lib/consent';

describe('teen consent gate', () => {
  it('asks for nothing when the photo has no member in it', () => {
    expect(missingConsent({ subject: 'none' })).toEqual([]);
    expect(hasRequiredConsent({ subject: 'none' })).toBe(true);
  });

  it('asks for nothing for an adult member', () => {
    expect(missingConsent({ subject: 'adult-member' })).toEqual([]);
  });

  it('requires both consents, a date and a record reference for a teen', () => {
    expect(missingConsent({ subject: 'teen-member' })).toEqual([
      'consentTeen',
      'consentParent',
      'consentDate',
      'consentRecordRef',
    ]);
  });

  it('is not satisfied by the teen consent alone', () => {
    expect(
      missingConsent({
        subject: 'teen-member',
        consentTeen: true,
        consentDate: '2026-01-01',
        consentRecordRef: 'A-12',
      }),
    ).toEqual(['consentParent']);
  });

  it('rejects an unticked checkbox and blank references', () => {
    expect(
      missingConsent({
        subject: 'teen-member',
        consentTeen: true,
        consentParent: false,
        consentDate: '2026-01-01',
        consentRecordRef: '   ',
      }),
    ).toEqual(['consentParent', 'consentRecordRef']);
  });

  it('passes when everything is recorded', () => {
    expect(
      hasRequiredConsent({
        subject: 'teen-member',
        consentTeen: true,
        consentParent: true,
        consentDate: '2026-01-01',
        consentRecordRef: 'Зөвшөөрөл A-12',
      }),
    ).toBe(true);
  });

  it('explains what is missing in both languages', () => {
    const message = consentErrorMessage(['consentParent', 'consentDate']);
    expect(message).toContain('Эцэг эхийн зөвшөөрөл');
    expect(message).toContain("a parent's consent");
  });
});
