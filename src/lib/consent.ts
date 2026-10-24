/**
 * Consent gate for member photographs (CLAUDE.md rule 4).
 *
 * A photograph whose subject is a teen member may only be saved when a
 * written consent from both the teen and a parent has been recorded, with a
 * date and a reference to where the paper record is kept. Nothing about the
 * minor is stored here — only the fact that consent exists.
 */

export const mediaSubjects = ['none', 'adult-member', 'teen-member'] as const;
export type MediaSubject = (typeof mediaSubjects)[number];

export type ConsentInput = {
  subject?: MediaSubject | null;
  consentTeen?: boolean | null;
  consentParent?: boolean | null;
  consentDate?: string | null;
  consentRecordRef?: string | null;
};

export const consentFields = [
  'consentTeen',
  'consentParent',
  'consentDate',
  'consentRecordRef',
] as const;

export type ConsentField = (typeof consentFields)[number];

/** Which consent requirements are not met. Empty array means the file may be saved. */
export function missingConsent(data: ConsentInput): ConsentField[] {
  if (data.subject !== 'teen-member') return [];

  const missing: ConsentField[] = [];
  if (data.consentTeen !== true) missing.push('consentTeen');
  if (data.consentParent !== true) missing.push('consentParent');
  if (!data.consentDate) missing.push('consentDate');
  if (!data.consentRecordRef?.trim()) missing.push('consentRecordRef');
  return missing;
}

export function hasRequiredConsent(data: ConsentInput): boolean {
  return missingConsent(data).length === 0;
}

const labels: Record<ConsentField, { mn: string; en: string }> = {
  consentTeen: { mn: 'Хүүхдийн зөвшөөрөл', en: "the teen's consent" },
  consentParent: { mn: 'Эцэг эхийн зөвшөөрөл', en: "a parent's consent" },
  consentDate: { mn: 'Зөвшөөрлийн огноо', en: 'the consent date' },
  consentRecordRef: {
    mn: 'Зөвшөөрлийн бичгийн баримтын дугаар',
    en: 'the reference of the written record',
  },
};

/** Bilingual message, because the editor may be working in either language. */
export function consentErrorMessage(missing: ConsentField[]): string {
  const mn = missing.map((field) => labels[field].mn).join(', ');
  const en = missing.map((field) => labels[field].en).join(', ');
  return (
    `Хүүхэд, залуу гишүүний зураг хадгалахын тулд дараах нь шаардлагатай: ${mn}. ` +
    `A photo of a teen member cannot be saved without ${en}.`
  );
}
