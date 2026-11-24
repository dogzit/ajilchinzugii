import type { CvWire } from './extraction';

/**
 * The deterministic CV reader behind RATER_EXTRACTOR=mock (tests, CI, local
 * runs only). It finds sections by their headings and quotes lines exactly,
 * so its output passes the same evidence check as the model's.
 */

const SECTIONS: [keyof Pick<CvWire, 'education' | 'experience' | 'skills' | 'languages' | 'achievements'> | 'references' | 'family', RegExp][] = [
  ['education', /^(боловсрол|education)(?=$|[\s:])/i],
  ['experience', /^(ажлын туршлага|туршлага|experience)(?=$|[\s:])/i],
  ['skills', /^(ур чадвар|skills)(?=$|[\s:])/i],
  ['languages', /^(хэлний мэдлэг|хэл|languages)(?=$|[\s:])/i],
  ['achievements', /^(амжилт|achievements)(?=$|[\s:])/i],
  ['references', /^(тодорхойлолт|references)(?=$|[\s:])/i],
  ['family', /^(гэр бүл|family)(?=$|[\s:])/i],
];

const kindOf = (line: string): CvWire['experience'][number]['kind'] =>
  /сайн дур|volunteer/i.test(line) ? 'volunteer' : /төсөл|project/i.test(line) ? 'school_project' : /гэр бүлийн|family/i.test(line) ? 'family_business' : /мал|herd/i.test(line) ? 'herding' : 'job';

export function readCv(text: string): CvWire {
  const out: CvWire = {
    language: /[а-яөү]/i.test(text) ? 'mn-cyrl' : 'en',
    contact: { phone: null, email: null, other: null },
    home_address: false,
    family_details: false,
    education: [],
    experience: [],
    skills: [],
    languages: [],
    achievements: [],
    references: false,
    spelling_issues: [],
    tone: 'ok',
    suggestions: [],
    evidence: [],
  };
  let section: (typeof SECTIONS)[number][0] | null = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const heading = SECTIONS.find(([, re]) => re.test(line));
    if (heading) {
      section = heading[0];
      if (section === 'family') {
        out.family_details = true;
        out.evidence.push({ field: 'family_details', excerpt: line });
      }
      if (section === 'references') {
        out.references = true;
        out.evidence.push({ field: 'references', excerpt: line });
      }
      continue;
    }
    if (/^(гэрийн хаяг|хаяг|address)\s*:/i.test(line)) {
      out.home_address = true;
      out.evidence.push({ field: 'home_address', excerpt: line });
    }
    if (/facebook|instagram/i.test(line)) {
      out.contact.other = true;
      out.evidence.push({ field: 'contact.other', excerpt: line });
    }
    if (/!!!|:\)/.test(line)) {
      out.tone = 'too_informal';
      out.evidence.push({ field: 'tone', excerpt: line });
    }
    if (section === 'education') out.education.push(line);
    if (section === 'experience') out.experience.push({ kind: kindOf(line), excerpt: line });
    if (section === 'skills' || section === 'languages') out[section].push(...line.split(/[,;]/).map((s) => s.trim()).filter(Boolean));
    if (section === 'achievements') out.achievements.push({ excerpt: line });
  }
  const plain = out.achievements.find((a) => !/\d/.test(a.excerpt));
  if (plain) out.suggestions.push({ excerpt: plain.excerpt, suggestion: 'Add a number to show the result.' });
  return out;
}
