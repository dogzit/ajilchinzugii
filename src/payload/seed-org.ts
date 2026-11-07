import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from '@payloadcms/db-postgres';
import { getPayload } from 'payload';
import config from '../payload.config';
import { isDemoValue, isPlaceholder } from '../lib/placeholder';

/** True when the field is still empty, a TBD placeholder, or leftover demo text. */
const needsRealContent = (value?: string | null): boolean =>
  isPlaceholder(value) || isDemoValue(value);

/**
 * The organisation's real content, as given by the client in 2026-11.
 *
 * Unlike seed.ts (placeholders for a brand-new install), this writes actual
 * copy: the mission line, the methodology definitions and counting rules,
 * the policy proposal, the first research paper, and the three named
 * partners. Figures still come only from the Google Sheet pipeline — nothing
 * here is an impact number.
 *
 * Each field is written only if it is currently empty or still the TBD
 * placeholder, so re-running this after an editor has made real edits in
 * `/admin` will not clobber their work.
 *
 * Run with: pnpm seed:org
 */

const TBD = '[ХҮЛЭЭГДЭЖ БУЙ / TBD]';

/** Minimal Lexical document holding one paragraph per string given. */
const richText = (paragraphs: string[]) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: paragraphs.map((text) => ({
      type: 'paragraph',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      textFormat: 0,
      children: [
        {
          type: 'text',
          detail: 0,
          format: 0,
          mode: 'normal',
          style: '',
          text,
          version: 1,
        },
      ],
    })),
  },
});

type Row = Record<string, unknown>;

/**
 * Writes a localized array in two passes without losing the first language.
 * See seed.ts for why: Payload keys a localized array's rows to their ids,
 * so the second-language write must reuse the ids the first write created.
 */
const withIds = (
  rows: readonly Row[],
  saved: { id?: string | null }[] | null | undefined,
): Row[] => rows.map((row, index) => ({ ...row, id: saved?.[index]?.id ?? undefined }));

// ── Methodology content ────────────────────────────────────────────────────

type Bilingual<T> = { mn: T; en: T };

const def = (
  anchorId: string,
  term: Bilingual<string>,
  definition: Bilingual<string>,
): {
  anchorId: string;
  mn: { term: string; definition: string };
  en: { term: string; definition: string };
} => ({
  anchorId,
  mn: { term: term.mn, definition: definition.mn },
  en: { term: term.en, definition: definition.en },
});

const DEFINITIONS = [
  def(
    'working-teen',
    { mn: 'Ажил эрхэлдэг өсвөр нас', en: 'Working teen' },
    {
      mn: 'Монголд амьдардаг 13–19 насны, өөрийн гэр бүлээс гадна хэн нэгэнд цалинтай эсвэл хангамжийн хэлбэрээр ажил хийдэг хүн. Малчин гэр бүлийн мал маллах, гэрийн ажил үүний хамаарахгүй, зөвхөн тухайн өсвөр нас өөрөө тусламж хүсвэл тооцогдоно.',
      en: 'Anyone aged 13–19 in Mongolia who works for pay or in kind for someone outside their own household. Family herding and household chores are left out unless the teen asks for help with them.',
    },
  ),
  def(
    'member',
    { mn: 'Гишүүн', en: 'Member' },
    {
      mn: 'Нэр, нас, холбоо барих мэдээлэл, ажил олгогч буюу салбараа мэдүүлж, зөвшөөрөл өгч бүртгүүлсэн ажил эрхэлдэг өсвөр нас. 16 нас хүрээгүй хүн бол асран хамгаалагчийн зөвшөөрөл шаардлагатай.',
      en: 'A working teen who has registered, giving their name, age, contact details, employer or sector, and consent. A guardian’s consent is needed for anyone under 16.',
    },
  ),
  def(
    'active-member',
    { mn: 'Идэвхтэй гишүүн', en: 'Active member' },
    {
      mn: 'Сүүлийн 90 хоногт байгууллагатай дор хаяж нэг удаа холбогдсон гишүүн.',
      en: 'A member who has had at least one contact with the organisation in the last 90 days.',
    },
  ),
  def(
    'contact',
    { mn: 'Холбогдол', en: 'Contact' },
    {
      mn: 'Өсвөр настай хийсэн ямар нэгэн харилцан үйлчлэл: мессеж, дуудлага, уулзалт, сургалт зэрэг. Хамрах хүрээг тоолоход ашиглагдана, хэрэг биш.',
      en: 'Any interaction with a teen, such as a message, call, visit or workshop. It is counted for reach but is not a case.',
    },
  ),
  def(
    'inquiry',
    { mn: 'Асуулга', en: 'Inquiry' },
    {
      mn: 'Нэг, хоёр холбогдлоор хариулагдах, гуравдагч этгээдэд хандах шаардлагагүй мэдээлэл хүссэн хүсэлт. Жишээ нь: "Хөдөлмөрийн хамгийн бага хөлс хэд вэ?"',
      en: 'A request for information that is answered in one or two contacts with no action toward a third party. For example: "What’s the minimum wage?" or "Can my boss make me work 40 hours?"',
    },
  ),
  def(
    'case',
    { mn: 'Хэрэг', en: 'Case' },
    {
      mn: 'Дараах дөрвөн нөхцлийг хангасан тодорхой гомдол: (1) тодорхой ажилтантай холбоотой, (2) тодорхой ажил олгогч буюу ажлын зохицуулалттай холбоотой, (3) хууль, гэрээ, хэлэлцээр буюу суурь аюулгүй байдлыг зөрчсөн байх магадлалтай, (4) шийдвэрлэхийн тулд гуравдагч этгээд (ажил олгогч, асран хамгаалагч, сургуулиэсвэл эрх бүхий байгууллага) оролцох шаардлагатай. Хэрэг нь intake хуудас бөглөгдөж, өсвөр нас арга хэмжээ авахад зөвшөөрөл өгсөн өдрөөс эхэлнэ.',
      en: 'A specific grievance that involves an identified worker, an identified employer or work arrangement, a likely breach of law, contract or basic safety, and needs action involving a third party (the employer, a guardian, a school, or an authority). A case opens on the date the intake form is completed and the teen consents to action.',
    },
  ),
  def(
    'collective-case',
    { mn: 'Хамтын хэрэг', en: 'Collective case' },
    {
      mn: 'Нэг ажил олгогчтой холбоотой 3 буюу түүнээс олон ажилтны хуваалцсан нэг гомдол. Нэг хэрэг гэж тоологдох ба хамрагдсан ажилтны тоог тусад нь бүртгэнэ.',
      en: 'A single grievance shared by 3 or more workers at the same employer. It counts as one case, and the number of workers covered is recorded separately.',
    },
  ),
  def(
    'collective-agreement',
    { mn: 'Хамтын хэлэлцээр', en: 'Collective agreement' },
    {
      mn: 'Ажил олгогч, Ажилчин Зөгий хоёрын хооронд холбогдох өсвөр насныхны нэрийн өмнөөс байгуулж, тэдний цалин, цагийн хуваарь, аюулгүй байдал, сургуулийн нөхцлийг тогтоосон бичгээр баталгаажуулсан хэлэлцээр.',
      en: 'A written agreement signed by an employer and Ajilchin Zugii, on behalf of the working teens concerned, that sets terms for their pay, hours, safety or schooling at that employer.',
    },
  ),
  def(
    'case-type-wages',
    { mn: 'Хэргийн төрөл: цалин хөлс', en: 'Case type: wages' },
    {
      mn: 'Олгогдоогүй цалин, хамгийн бага цалингаас доогуур хөлс, эсвэл суутгал.',
      en: 'Unpaid wages, pay below the minimum wage, or deductions.',
    },
  ),
  def(
    'case-type-hours',
    { mn: 'Хэргийн төрөл: ажлын цаг', en: 'Case type: hours' },
    {
      mn: '7 хоногт 30 цагаас илүү, шөнийн ажил, эсвэл сургуулийн цагаар ажилласан.',
      en: 'More than 30 hours a week, night work, or work during school hours.',
    },
  ),
  def(
    'case-type-hazardous-work',
    { mn: 'Хэргийн төрөл: аюултай ажил', en: 'Case type: hazardous work' },
    {
      mn: 'Хүнд ачаа, аюултай машин механизм, хэт хүйтэн орчин, том амьтан, уралдаанд морь унах зэрэг.',
      en: 'Heavy loads, dangerous machinery, extreme cold, large animals, or horse racing.',
    },
  ),
  def(
    'case-type-underage-employment',
    {
      mn: 'Хэргийн төрөл: насанд хүрэлцээгүй хөдөлмөр эрхлэлт',
      en: 'Case type: underage employment',
    },
    {
      mn: 'Тухайн төрлийн ажилд хуулиар зөвшөөрөгдсөн насаас доогуур насандаа ажиллах.',
      en: 'Working below the legal age for the type of work.',
    },
  ),
  def(
    'case-type-injury',
    { mn: 'Хэргийн төрөл: ажлын байрны осол', en: 'Case type: injury' },
    { mn: 'Ажлын байранд гэмтсэн.', en: 'Injury at work.' },
  ),
  def(
    'case-type-dismissal-contract',
    { mn: 'Хэргийн төрөл: ажлаас халах, гэрээ', en: 'Case type: dismissal or contract' },
    {
      mn: 'Цалин төлөхгүйгээр халагдах, эсвэл бичгээр гэрээ байгуулаагүй байх.',
      en: 'Firing without pay, or no written terms.',
    },
  ),
  def(
    'case-type-abuse-harassment',
    {
      mn: 'Хэргийн төрөл: хүчирхийлэл, дарамт',
      en: 'Case type: abuse, harassment or coercion',
    },
    {
      mn: 'Хүчирхийлэл, дарамт шаардлага, ажлаасаа гарч чадахгүй байгаа өсвөр нас орно.',
      en: 'Abuse, harassment or coercion, including a teen who cannot leave the job.',
    },
  ),
  def(
    'case-type-schooling-conflict',
    { mn: 'Хэргийн төрөл: сургалттай зөрчилдөх', en: 'Case type: schooling conflict' },
    {
      mn: 'Ажил нь сургуульд тасалдал, сургуулиа орхихоос шалтгаалах.',
      en: 'Work forcing absence from school or dropout.',
    },
  ),
  def(
    'case-status-intake',
    { mn: 'Хэргийн төлөв: бүртгэгдсэн', en: 'Case status: intake' },
    {
      mn: 'Гомдол мэдэгдсэн бөгөөд хэргийн тодорхойлолтод нийцэж байгаа эсэхийг шалгаж байна.',
      en: 'The grievance has been reported and is being checked against the case definition.',
    },
  ),
  def(
    'case-status-verified',
    { mn: 'Хэргийн төлөв: баталгаажсан', en: 'Case status: verified' },
    {
      mn: 'Өсвөр насны хэлсэн үгнээс гадна дор хаяж нэг нотолгоо байгаа: цалингийн баримт, зурвас, гэрч, зураг, эмнэлгийн тэмдэглэл зэрэг.',
      en: 'There is at least one piece of evidence beyond the teen’s account, such as a pay record, messages, a witness, a photo or a medical note.',
    },
  ),
  def(
    'case-status-active',
    { mn: 'Хэргийн төлөв: ажиллагаатай', en: 'Case status: active' },
    {
      mn: 'Ажил олгогчтой холбогдох, хэлэлцээ хийх, зуучлах зэрэг арга хэмжээ явагдаж байна.',
      en: 'Action is underway, such as contacting the employer, negotiating or mediating.',
    },
  ),
  def(
    'case-status-closed',
    { mn: 'Хэргийн төлөв: хаагдсан', en: 'Case status: closed' },
    {
      mn: 'Хэрэг дараах үр дүнгүүдийн яг нэгээр хаагдсан байна.',
      en: 'The case has ended with exactly one of the defined outcomes.',
    },
  ),
  def(
    'outcome-resolved-full',
    { mn: 'Үр дүн: бүрэн шийдвэрлэгдсэн', en: 'Outcome: resolved (full)' },
    {
      mn: 'Intake үед өсвөр насны хүссэн тодорхой засал олдсон бөгөөд: (1) үүнийг нотлох баримт байгаа (банкны шилжүүлэг, баримт, гарын үсэг зурсан хэлэлцээр, өөрчлөгдсөн хуваарь), (2) 30 хоногийн дараагийн уулзалт дээр өсвөр нас үүнийг баталсан.',
      en: 'The specific remedy the teen asked for at intake was obtained, with evidence of it, and the teen confirms it at a follow-up 30 days later.',
    },
  ),
  def(
    'outcome-resolved-partial',
    { mn: 'Үр дүн: хэсэгчлэн шийдвэрлэгдсэн', en: 'Outcome: resolved (partial)' },
    {
      mn: 'Заслын зарим хэсэг нь олдсон, жишээ нь, олгогдоогүй цалингийн тал хувь, эсвэл цаг бага болсон ч хуулиар зөвшөөрөгдсөн хязгаараас дээгүүр хэвээр байна.',
      en: 'Part of the remedy was obtained, for example half the back pay, or fewer hours but still over the limit.',
    },
  ),
  def(
    'outcome-referred',
    { mn: 'Үр дүн: шилжүүлсэн', en: 'Outcome: referred' },
    {
      mn: 'Хэргийг Хөдөлмөрийн хяналтын байгууллага, хүүхэд хамгааллын алба эсвэл цагдаад шилжүүлсэн. Зөвхөн тухайн байгууллага арга хэмжээ авч, өсвөр нас үр дүнг баталсан тохиолдолд шийдвэрлэгдсэн гэж тооцогдоно.',
      en: 'The case was handed to the Labour Inspection Agency, child protection services or the police. It counts as resolved only if that body acts and the teen confirms the outcome.',
    },
  ),
  def(
    'outcome-unresolved',
    { mn: 'Үр дүн: шийдвэрлэгдээгүй', en: 'Outcome: unresolved' },
    {
      mn: 'Боломжтой бүх алхамыг хийсэн ч засал олдоогүй.',
      en: 'All available steps were taken and no remedy was obtained.',
    },
  ),
  def(
    'outcome-withdrawn',
    { mn: 'Үр дүн: хэрэгсэхгүй болгосон', en: 'Outcome: withdrawn' },
    {
      mn: 'Өсвөр нас хэргийг зогсоосон. Хэрэгсэхгүй болгосон хэргүүдийг шийдвэрлэх хувь хэмжээнд тооцохгүй, харин тусад нь бүртгэнэ, учир нь өндөр тоо нь ажил олгогчоосоо айж байгааг илтгэх боломжтой.',
      en: 'The teen ended the case. Withdrawn cases are left out of the resolution rate but counted separately, because a high number can signal fear of the employer.',
    },
  ),
  def(
    'sustained-resolution',
    { mn: 'Тогтвортой шийдэл', en: 'Sustained resolution' },
    {
      mn: 'Бүрэн шийдвэрлэгдсэн хэрэг бөгөөд тухайн ажил олгогчтой холбоотой ижил асуудал 90 хоногийн дотор дахин гараагүй.',
      en: 'A fully resolved case where the same problem with the same employer has not come back after 90 days.',
    },
  ),
  def(
    'safeguarding-override',
    { mn: 'Хамгааллын тэргүүлэх зарчим', en: 'Safeguarding override' },
    {
      mn: 'Хүчирхийлэл, шаардлага тулгалт, хүний наймааны шинж тэмдэг, эсвэл 13 нас хүрээгүй хүүхэд аюултай ажилд оролцсон тохиолдолд, өсвөр насны хүсэл хүслийг үл харгалзан эрх бүхий байгууллагад даруй шилжүүлнэ. Энэ бол хөдөлмөрийг дэмжих зарчмаас хамгааллын зарчимд шилждэг цор ганц цэг.',
      en: 'Abuse, coercion, signs of trafficking, or a child under 13 in hazardous work is referred to the authorities immediately, whatever the teen prefers. This is the one point where facilitating work gives way to protection.',
    },
  ),
];

const COUNTING_RULES: {
  anchorId: string;
  mn: { rule: string; detail: string };
  en: { rule: string; detail: string };
}[] = [
  {
    anchorId: 'counting-people-once',
    mn: {
      rule: 'Хүн бүрийг нэг удаа тоолно',
      detail:
        'Хүн бүрийг гишүүний ID ашиглан амьдралд нэг л удаа тоолно. Хоёр удаа холбогдсон өсвөр нас нэг хүн хэвээр байна.',
    },
    en: {
      rule: 'People are counted once each, ever',
      detail:
        'Using a member ID. A teen who contacts the organisation twice is still one person reached.',
    },
  },
  {
    anchorId: 'counting-contacts-every-time',
    mn: {
      rule: 'Холбогдол болгоныг тоолно',
      detail: 'Нэг өсвөр насны хоёр холбогдол хоёр холбогдол гэж тоологдоно.',
    },
    en: {
      rule: 'Contacts are counted every time',
      detail: 'Two contacts from the same teen count as two contacts.',
    },
  },
  {
    anchorId: 'counting-cases-per-grievance',
    mn: {
      rule: 'Хэргийн тоолол: ажил олгогч, гомдол тус бүрт нэг',
      detail:
        'Нэг ажилтны нэг асуудал нэг ажил олгогчоос гарч байгаа бол хэдэн удаа холбогдсон ч нэг хэрэг хэвээр байна. Нэг ажилтны өөр асуудал, эсвэл өөр ажил олгогчтой холбоотой бол шинэ хэрэг.',
    },
    en: {
      rule: 'Cases are one per grievance per employer',
      detail:
        'The same teen with the same problem from the same employer is one case, however many times they get in touch. The same teen with a different problem, or with a different employer, is a new case.',
    },
  },
  {
    anchorId: 'counting-recurrence',
    mn: {
      rule: 'Дахин гарсан асуудал шинэ хэрэг',
      detail:
        'Шийдвэрлэгдсэн гэж хаагдсан хэргийн асуудал дахин гарч ирэх нь шинэ хэрэг болно. Үүнийг давтагдал гэж тэмдэглэх бөгөөд энэ нь өмнөх хэргийн тогтвортой байдлын статусыг цуцална.',
    },
    en: {
      rule: 'A recurrence is a new case',
      detail:
        'The same problem coming back after the case was closed as resolved is a new case. It is flagged as a recurrence, which cancels the earlier case’s sustained status.',
    },
  },
  {
    anchorId: 'counting-collective-cases',
    mn: {
      rule: 'Хамтын хэргийг нэг хэрэг гэж тоолно',
      detail:
        'Хамтын хэрэг нэг хэрэг гэж тоологдож, хамрагдсан ажилтан бүрийг "хамрагдсан ажилтан" үзүүлэлтэд тоолно. Хүн бүрийг хүний тоонд нэг л удаа тоолно.',
    },
    en: {
      rule: 'Collective cases count as one case',
      detail:
        'Every worker covered is counted in "workers covered". Each worker is still counted only once in the people figure.',
    },
  },
  {
    anchorId: 'counting-inquiries-merged',
    mn: {
      rule: 'Давтан асуулгыг нэгтгэнэ',
      detail:
        'Асуулгыг асуулт бүрт нэг удаа тоолно. 7 хоногийн дотор ижил сэдвээр гарсан давтан асуулгыг нэг болгон нэгтгэнэ.',
    },
    en: {
      rule: 'Inquiries are counted once per question',
      detail: 'Repeat inquiries on the same topic within 7 days are merged into one.',
    },
  },
  {
    anchorId: 'counting-money-hours-verified',
    mn: {
      rule: 'Мөнгө, цагийг баталгаажсан мөч дээр нэг удаа тоолно',
      detail: 'Зөвхөн амлалт байхад юу ч тоологдохгүй.',
    },
    en: {
      rule: 'Money and hours are counted once, at verification',
      detail: 'Nothing is counted when it is only promised.',
    },
  },
  {
    anchorId: 'counting-outcomes-once',
    mn: {
      rule: 'Үр дүнг эцсийн төлвөөр нэг удаа бүртгэнэ',
      detail:
        'Хэсэгчлэн шийдвэрлэгдсэн хэрэг хожим бүрэн шийдвэрлэгдвэл зөвхөн бүрэн гэж тоологдоно, хоёуланг нь хэзээ ч тоолохгүй.',
    },
    en: {
      rule: 'Outcomes are recorded once per case, at the final status',
      detail:
        'A partial resolution that later becomes a full one is counted as full only, never as both.',
    },
  },
  {
    anchorId: 'counting-reporting-period',
    mn: {
      rule: 'Тайлант хугацаа: хаагдсан улиралаар',
      detail:
        'Хэрэг хаагдсан улирлаараа тооцогдоно. Нээгдсэн хэргүүдийг тусад нь, нээгдсэн улирлаараа тайлагнана.',
    },
    en: {
      rule: 'Reporting period: a case belongs to the quarter it closed in',
      detail: 'Opened cases are reported separately by the quarter they opened in.',
    },
  },
  {
    anchorId: 'counting-small-numbers',
    mn: {
      rule: '5-аас цөөн тохиолдлыг тоогоор харуулахгүй',
      detail:
        '5-аас цөөн хэрэг дээр суурилсан аливаа тоо хэзээ ч тоогоор харагдахгүй. "5-аас цөөн" гэсэн тэмдэглэгээ ашиглана, ямар ч хүүхдийг таниулахгүйн тулд. Иймээс нийт дүн сарын дүнгийн нийлбэртэй тэнцэхгүй байж болно.',
    },
    en: {
      rule: 'Small numbers: fewer than 5 cases are never shown as a number',
      detail:
        'Any figure based on fewer than 5 cases is shown as "fewer than 5", so that no child can be identified. A total may therefore not equal the sum of its months.',
    },
  },
  {
    anchorId: 'counting-start-of-counting',
    mn: {
      rule: 'Тоолол эхэлсэн цэг',
      detail:
        'Тоолол хэргийн бүртгэлд орсон анхны хэргээс эхэлнэ. Энэ өдрөөс өмнөх юуг ч тооцохгүй, бүх тоо улирал, сараар тэмдэглэгдээгүй бол тухайн өдрөөс хойш хуримтлагдсан дүн болно.',
    },
    en: {
      rule: 'Start of counting',
      detail:
        'Counting starts with the first case entered in the case log. Nothing before that date is counted, and every figure is cumulative from it unless labelled as a quarter or a month.',
    },
  },
  {
    anchorId: 'counting-case-open-close',
    mn: {
      rule: 'Хэрэг нээгдэх, хаагдах огноо',
      detail:
        'Хэрэг intake өдрөөс нээгдсэн, үр дүн бүртгэгдсэн өдрөөр хаагдсан гэж тооцогдоно. 30 хоног, 90 хоногийн дараагийн уулзалт нь зөвхөн тухайн хэргийн үр дүнг шинэчилнэ, шинэ хэрэг нээхгүй.',
    },
    en: {
      rule: 'Start and end of a case',
      detail:
        'A case is counted as open from its intake date and as closed on the date its outcome is recorded. The 30-day and 90-day follow-ups update the outcome of the same case and never open a new one.',
    },
  },
  {
    anchorId: 'counting-open-at-period-end',
    mn: {
      rule: 'Тайлант үеийн төгсгөлд нээлттэй хэрэг',
      detail:
        'Тайлант үе дуусахад нээлттэй хэвээр байгаа хэргийг тухайн үед нээлттэй гэж, зөвхөн хаагдсан улиралд хаагдсан гэж тооцно.',
    },
    en: {
      rule: 'Open cases at the end of a period',
      detail:
        'A case still open when a reporting period ends is reported as open in that period and counted as closed only in the quarter it closes.',
    },
  },
  {
    anchorId: 'counting-membership-window',
    mn: {
      rule: 'Гишүүнчлэлийн тоолол',
      detail:
        'Гишүүн бүртгүүлсэн өдрөөсөө хойш нийт гишүүний тоонд тооцогдоно. Сүүлийн холбогдлоосоо хойш 90 хоногийн турш идэвхтэй гэж тооцогдож, дараа нь дахин холбогдох хүртэл идэвхтэй тооноос хасагдана.',
    },
    en: {
      rule: 'Membership',
      detail:
        'A member is counted in total members from the date they register. They count as active for 90 days after their last contact, then leave the active figure until they get in touch again.',
    },
  },
  {
    anchorId: 'counting-as-of-date',
    mn: {
      rule: 'Он сар өдрийн тэмдэглэгээ',
      detail:
        'Нийтлэгдсэн тоо бүр хэдний байдлаар үнэн болохыг харуулсан огноотой байна.',
    },
    en: {
      rule: 'As-of date',
      detail: 'Every published figure shows the date it is true as of.',
    },
  },
];

const SOURCES = [
  {
    mn: {
      title: 'Ажилчин Зөгийн хэргийн бүртгэл',
      note: 'Дотоод, хэзээ ч нийтлэгдэхгүй. Нийтлэгдсэн бүх үзүүлэлт үүнээс тооцсон нийлбэр дүн.',
    },
    en: {
      title: 'Ajilchin Zugii case log',
      note: 'Internal and never shared. All impact figures are totals computed from it.',
    },
  },
  {
    mn: {
      title: 'Үндэсний Статистикийн Хороо (nso.mn)',
      note: 'Хүүхдийн хөдөлмөрийн судалгаа 2021–22 ба Хөдөлмөр эрхлэлтийн судалгаа, үндэсний түвшний суурь мэдээлэлд ашиглагдана.',
    },
    en: {
      title: 'National Statistics Office of Mongolia (nso.mn)',
      note: 'Child Labour Survey 2021–22 and Labour Force Survey, used for national context on child labour.',
    },
  },
  {
    mn: {
      title: 'Олон Улсын Хөдөлмөрийн Байгууллага (ilo.org)',
      note: '2021–22 оны Хүүхдийн хөдөлмөрийн судалгааны түнш, ашигласан хүүхдийн хөдөлмөрийн тодорхойлолтын эх сурвалж.',
    },
    en: {
      title: 'International Labour Organization (ilo.org)',
      note: 'Partner on the 2021–22 Child Labour Survey and source of the child-labour definitions used.',
    },
  },
  {
    mn: {
      title:
        'АНУ-ын Хөдөлмөрийн яамны Олон улсын хөдөлмөрийн асуудал эрхэлсэн алба (dol.gov/agencies/ilab)',
      note: '2024 оны Монгол дахь хүүхдийн хөдөлмөрийн хамгийн хүнд хэлбэрүүдийн тухай тайлан, ашигласан хөдөлмөрийн хяналтын тоо мэдээллийн эх сурвалж.',
    },
    en: {
      title:
        'U.S. Department of Labor, Bureau of International Labor Affairs (dol.gov/agencies/ilab)',
      note: '2024 Findings on the Worst Forms of Child Labor: Mongolia, source of the labour inspection figures used in the policy proposal.',
    },
  },
] as const;

const measureCategory = (
  category: Bilingual<string>,
  items: Bilingual<string>[],
): { category: Bilingual<string>; items: Bilingual<string>[] } => ({ category, items });

/** What is measured — never an actual number, which comes only from the sheet. */
const MEASURES = [
  measureCategory({ mn: 'Хамрах хүрээ', en: 'Reach' }, [
    {
      mn: 'Нийт гишүүн, идэвхтэй гишүүн, нас, хүйс, аймаг, салбар, хот/хөдөөгөөр задаргаатай.',
      en: 'Total members and active members, broken down by age, sex, aimag, sector and urban or rural location.',
    },
    { mn: 'Холбогдол, асуулгын тоо.', en: 'Number of contacts and inquiries.' },
    { mn: 'Сургалтад хамрагдалт.', en: 'Workshop attendance.' },
    {
      mn: 'Үндсэн 3 эрхийг (хамгийн бага цалин, 30 цагийн хязгаар, аюултай ажлыг хориглосон) нэрлэж чадах гишүүдийн тоо, бүртгүүлэх үед, дараа нь 6 сарын дараа дахин шалгасан.',
      en: 'Members who can name 3 core rights: minimum wage, the 30-hour limit and the hazardous-work ban. This is tested at registration and again after 6 months.',
    },
  ]),
  measureCategory({ mn: 'Хэргийн хэмжээ', en: 'Case volume' }, [
    {
      mn: 'Улирал тутамд нээгдсэн, баталгаажсан, хаагдсан хэргийн тоо.',
      en: 'Cases opened, verified and closed per quarter.',
    },
    { mn: 'Хэргийн төрлөөр нь хуваарилалт.', en: 'Case mix by type.' },
    {
      mn: 'Хамтын хэргийн тоо, хамрагдсан ажилтны тоо.',
      en: 'Number of collective cases and the workers they cover.',
    },
  ]),
  measureCategory({ mn: 'Үр нөлөө', en: 'Effectiveness' }, [
    {
      mn: 'Шийдвэрлэх хувь хэмжээ: бүрэн шийдвэрлэгдсэн хэрэг ÷ хаагдсан хэрэг, хэрэгсэхгүй болгосныг оруулахгүй. Хэсэгчлэн шийдвэрлэгдснийг тусад нь мэдээлнэ.',
      en: 'Resolution rate: cases fully resolved ÷ closed cases, with withdrawn cases excluded. Partial resolutions are reported separately.',
    },
    {
      mn: 'Тогтвортой шийдлийн хувь хэмжээ: тогтвортой шийдэл ÷ бүрэн шийдэл.',
      en: 'Sustained resolution rate: sustained resolutions ÷ full resolutions.',
    },
    {
      mn: 'Шийдвэрлэхэд зарцуулсан дундаж хоног: бүртгэлээс хаагдах хүртэл.',
      en: 'Median days to resolution: from intake to close.',
    },
    {
      mn: 'Шилжүүлгийн гүйцэтгэл: эрх бүхий байгууллага арга хэмжээ авсан шилжүүлсэн хэрэг ÷ бүх шилжүүлсэн хэрэг.',
      en: 'Referral follow-through: referred cases where the authority acted ÷ all referred cases.',
    },
    { mn: 'Хэрэгсэхгүй болгосон хувь хэмжээ.', en: 'Withdrawal rate.' },
  ]),
  measureCategory({ mn: 'Бодит үр дүн', en: 'Material outcomes' }, [
    {
      mn: 'Төгрөгөөр сэргээгдсэн цалин, нийт дүн ба хэргийн дундаж.',
      en: 'Wages recovered in MNT, as both a total and a per-case median.',
    },
    {
      mn: 'Хуулийн хязгаараас илүү байсан, арилгасан долоо хоногийн ажлын цаг.',
      en: 'Weekly hours over the legal limit that were eliminated.',
    },
    {
      mn: 'Ажлаа хадгалсан хэвээр, аюултай ажлаас гаргасан өсвөр насныхны тоо. Энэ бол хөдөлмөрийг зогсоохоос илүү дэмжих эрхэм зорилгыг харуулсан тул гол үзүүлэлт.',
      en: 'Teens removed from a hazardous task while keeping their job. This is the headline measure, since it shows the mission of facilitating work rather than stopping it.',
    },
    {
      mn: 'Нөхөн олговор, эмчилгээний зардал авсан гэмтсэн өсвөр насныхны тоо.',
      en: 'Injured teens who received compensation or medical costs.',
    },
    {
      mn: 'Сургалтын зөрчилтэй хэргүүдийн дундаас сургуульд үлдсэн өсвөр насныхны тоо, дараагийн улирлын элсэлтээр шалгасан.',
      en: 'Teens kept in school among schooling-conflict cases, checked by enrolment at the next term.',
    },
  ]),
  measureCategory({ mn: 'Хамтын хүч', en: 'Collective power' }, [
    {
      mn: 'Ажил олгогчтой байгуулсан хамтын хэлэлцээрийн тоо.',
      en: 'Collective agreements signed with employers.',
    },
    {
      mn: 'Давтан зөрчил гаргасан ажил олгогчдын тоо.',
      en: 'Employers with a repeat violation.',
    },
    { mn: 'Хэлэлцээрт хамрагдсан ажилтны тоо.', en: 'Workers covered by agreements.' },
  ]),
  measureCategory({ mn: 'Бодлого', en: 'Policy' }, [
    {
      mn: 'Улсын Их Хурал, яамдад хүргүүлсэн албан ёсны саналын тоо.',
      en: 'Formal submissions to parliament or ministries.',
    },
    { mn: 'Нийтлэгдсэн мэдээллийн хураангуйн тоо.', en: 'Data briefs published.' },
    {
      mn: 'Байгууллагын ажлыг иш татсан, батлагдсан заалтын тоо.',
      en: 'Provisions adopted that cite the organisation’s work.',
    },
  ]),
  measureCategory({ mn: 'Чанар', en: 'Quality' }, [
    {
      mn: '30 хоногийн дараагийн уулзалт дээр асуусан, үр дүнд сэтгэл хангалуун байдал, 1–5 оноогоор.',
      en: 'Teen satisfaction with the outcome on a 1–5 scale, asked at the 30-day follow-up.',
    },
    {
      mn: 'Бүрэн бүртгэлтэй хэргийн эзлэх хувь.',
      en: 'Share of cases with complete records.',
    },
  ]),
];

/** Writes a nested localized array (category -> items) across two locale passes. */
const withNestedIds = (
  categories: readonly { category: string; items: { label: string }[] }[],
  saved:
    { id?: string | null; items?: { id?: string | null }[] | null }[] | null | undefined,
): Row[] =>
  categories.map((cat, i) => ({
    ...cat,
    id: saved?.[i]?.id ?? undefined,
    items: cat.items.map((item, j) => ({
      ...item,
      id: saved?.[i]?.items?.[j]?.id ?? undefined,
    })),
  }));

const LIMITATIONS: Bilingual<string[]> = {
  mn: [
    'Эдгээр тоо нь зөвхөн Ажилчин Зөгийтэй холбогдсон өсвөр насныхныг хамарна. Тэд Монголд ажил эрхэлдэг бүх өсвөр насныхны дунд хөдөлмөрийн зөрчил хэр түгээмэл байгааг бус, байгууллага юу хийсэнийг харуулж байна.',
    'Зөвхөн өөрийн гэр бүлийнхэнд зориулж малчилж, гэрийн ажил хийдэг өсвөр нас, туслалцаа хүсэхээс бусад тохиолдолд, хамрах хүрээнээс гадуур байна.',
    'Дутуу мэдээлэгдэх магадлал өндөр. Ажлаасаа халагдахаас эмээж байгаа, хуулиар зөвшөөрөгдсөн насаас доогуур ажиллаж байгаа, хүчирхийлэлд өртсөн өсвөр насныхан хандах магадлал хамгийн бага.',
    'Хэрэг зөвхөн 30 хоногийн дараагийн уулзалт дээр өсвөр нас баталсан тохиолдолд бүрэн шийдвэрлэгдсэн гэж тооцогдоно. Тухайн үед холбоо барьж чадаагүй өсвөр насныхныг бүрэн шийдвэрлэгдсэн гэж тооцдоггүй тул шийдвэрлэх хувь хэмжээ бодит байдлаас доогуур харагдаж болзошгүй.',
    'Вэбсайтад иш татсан үндэсний статистик нь зөвхөн гэртээ амьдардаг хүүхдийг хамарсан ҲСХ/ОУХБ-ын 2021–22 оны Хүүхдийн хөдөлмөрийн судалгаанаас гаралтай. Уяачны байшинд амьдардаг хүүхэд уяач, гэргүй хүүхэд, хүний наймаанд өртсөн хүүхэд үүнд хамаарахгүй.',
  ],
  en: [
    'The figures cover only teens who contact Ajilchin Zugii. They show what the organisation did, not how common labour violations are among all working teens in Mongolia.',
    'Teens working only for their own family, in herding or household chores, are outside the scope unless they ask for help.',
    'Under-reporting is likely. Teens who fear losing their job, those working below the legal age, and those facing abuse are the least likely to come forward.',
    'A case counts as fully resolved only if the teen confirms it at the 30-day follow-up. Teens who cannot be reached then are not counted as fully resolved, so the resolution rate may understate results.',
    'National statistics cited on the site come from the NSO/ILO Child Labour Survey 2021–22, which covers only children living at home. Child jockeys at trainers’ camps, homeless children and trafficked children are not included.',
  ],
};

// ── Site ────────────────────────────────────────────────────────────────

const SITE = {
  missionLine: {
    mn: 'Хөдөлмөр эрхэлдэг залуусыг нэг эгнээнд нэгтгэснээр бид эрхээ мэддэг, хөдөлмөрийнхөн тухай хууль тогтоомжийг өөрсдөөр нь тодорхойлдог, улс орныг хүндэтгэлтэй хөдөлмөр рүү хөтлөх залуу үеийг төлөвшүүлнэ.',
    en: 'By uniting working youth into one collective voice, we raise a generation of young workers who know their rights, shape the laws that govern their labour, and lead the nation toward dignified work.',
  },
  city: { mn: 'Улаанбаатар', en: 'Ulaanbaatar' },
  foundingDate: '2026-06-01',
  contactEmail: 'ajilchinzugii.contact@gmail.com',
  legalName: 'Ajilchin Zugii NGO',
  seoTitle: 'Ajilchin Zugii',
  seoDescription: {
    mn: 'Ажилчин Зөгий бол ажил эрхэлдэг өсвөр насныханд зориулсан ТББ. Бид тэдэнд шударга хөлс, аюулгүй нөхцөл, сургуульд хамрагдах цагийг хамгаалж өгдөг.',
    en: 'Ajilchin Zugii is a union-style NGO for working teens in Mongolia. We help them claim fair pay, safe conditions and time for school.',
  },
};

// ── Policy ──────────────────────────────────────────────────────────────

const POLICY = {
  summary: {
    mn: 'Насанд хүрээгүй ажилтныг хамгаалах нэмэлт өөрчлөлтийн төсөл нь Монголын Хөдөлмөрийн тухай хуульд таван өөрчлөлт оруулахыг санал болгож байна, үүгээрээ төр гэр бүлээсээ гадна ажил олгогчдод ажилладаг хүүхдийг харж, хянаж, хамгаалах боломжтой болно. 7 хоногийн дундаж байдлаар ойролцоогоор 10,900 хүүхэд ийм төрлийн ажил эрхэлж байгаагаас 82% нь хуулийн дор хаяж нэг хязгаарыг зөрчдөг, гэвч Монголд ойролцоогоор 1.3 сая ажилчинд ногдож зөвхөн 66 хөдөлмөрийн хяналтын байцаагч байгаа бөгөөд хамгийн бага насны хязгаарыг зөрчиж хүүхэд ажиллуулсан тохиолдолд ямар ч торгууль байдаггүй. Нэмэлт өөрчлөлт нь 18 хүрээгүй ажилтан бүрийг бүртгэхийг ажил олгогчоос шаардах, бүртгэлтэй ажлын байранд урьдчилан мэдэгдэлгүй шалгалт хийх боломж олгох, хуулиас гадуур ажилласан хүүхэд тус бүрт торгууль тогтоох, 13–14 насны хүүхдэд зөвшөөрөгдсөн хөнгөн ажлын жагсаалтыг нийтлэх, хүүхдийн хөдөлмөрийн статистикт эдгээр хүүхдийг тусдаа бүлэг болгон тооцохыг шаарддаг.',
    en: 'The Minor Workers Protection Amendment proposes five changes to Mongolia’s Labour Law so that the state can see, inspect and protect children who work for employers outside their family. About 10,900 such children work in an average week, and 82% of them break at least one legal limit, yet Mongolia has 66 labour inspectors for about 1.3 million workers and no penalty for employing a child under the minimum age. The amendment requires employers to register every worker under 18, allows unannounced inspections of registered workplaces, sets a fine for each child employed outside the law, publishes a list of permitted light work for 13–14-year-olds, and requires child labour statistics to report these children as their own group.',
  },
  fullText: {
    mn: [
      'Санал болгож буй агуулга, Монгол дахь гэр бүлээсээ гадуур ажил олгогчдод ажилладаг хүүхдийн тухай (2026) судалгааны өгүүллийн 7-р бүлэгт заасны дагуу:',
      'Бүртгэл: ажил олгогч бүр 18 хүрээгүй ажилтан бүрийг ажилд авснаасаа хойш 7 хоногийн дотор орон нутгийн хөдөлмөрийн албанд онлайнаар бүртгүүлнэ, насыг, цагийн хуваарийг, үүргийг, эцэг эхийн бичгээр өгсөн зөвшөөрлийг заана.',
      'Шалгалт: бүртгэлтэй ажлын байранд урьдчилан мэдэгдэлгүй шалгалт хийх боломжтой.',
      'Торгуул: хуулийн насанд хүрээгүй, 7 хоногт 30 цагаас илүү, аюултай ажилд, эсвэл бүртгэлгүйгээр ажилласан хүүхэд бүрт сарын хамгийн бага цалингийн үржвэрээр тогтоосон торгууль, давтан зөрчилд хоёр дахин нэмэгдэнэ.',
      'Хөнгөн ажлын жагсаалт: төр 13–14 насны хүүхдэд зөвшөөрөгдсөн хөнгөн ажлын жагсаалтыг нийтэлнэ.',
      'Тооллого: хүүхдийн хөдөлмөрийн судалгаа бүр гэр бүлээсээ гадуур ажил олгогчдод ажилладаг хүүхдийг тусдаа үзүүлэлтээр мэдээлж, бүртгэлийн жилийн нийт дүнг нийтэлнэ.',
    ],
    en: [
      'The proposal as set out in Chapter 7 of the research paper Children Working for Outside Employers in Mongolia (2026):',
      'Register: every employer records each worker under 18 with the local labour office within 7 days of hiring, online, with the worker’s age, hours, tasks and a parent’s written consent.',
      'Inspect: workplaces on the register can be inspected without notice.',
      'Penalise: a fine for each child employed under age, over 30 hours a week, in hazardous work or unregistered, set as a multiple of the monthly minimum wage and doubled for repeat violations.',
      'Light work list: the state publishes a list of permitted light work for 13–14-year-olds.',
      'Count: each child labour survey reports children working for outside employers as its own figure, and the register’s yearly totals are published.',
    ],
  },
  history: [
    {
      date: '2026-09-01',
      status: 'drafted' as const,
      mn: 'Монгол дахь гэр бүлээсээ гадуур ажил олгогчдод ажилладаг хүүхдийн тухай судалгааны өгүүллийн 7-р бүлэг болгон боловсруулсан.',
      en: 'Drafted as Chapter 7 of the research paper Children Working for Outside Employers in Mongolia.',
    },
    {
      date: '2026-10-01',
      status: 'submitted' as const,
      mn: 'Судалгааны өгүүлэл болон саналыг Гэр бүл, хөдөлмөр, нийгмийн хамгааллын яаманд хүргүүлсэн.',
      en: 'Research paper and proposal sent to the Ministry of Family, Labour and Social Protection.',
    },
    {
      date: '2026-10-28',
      status: 'submitted' as const,
      mn: 'Монголын үйлдвэрчний эвлэлүүдийн холбооны дамжуулан Улсын Их Хуралд хэлэлцүүлэхээр хүргүүлсэн.',
      en: 'Submitted through the Confederation of Mongolian Trade Unions for parliamentary discussion.',
    },
  ],
  /**
   * Table 7.1 of the research paper: each change, the gap it closes and the
   * evidence behind it. The third column is the point of the table — a
   * proposal a reader cannot trace back to a finding is just an opinion.
   */
  proposals: [
    {
      mn: {
        change:
          'Бүртгэл: ажил олгогч бүр 18 хүрээгүй ажилтан бүрийг ажилд авснаасаа хойш 7 хоногийн дотор орон нутгийн хөдөлмөрийн албанд онлайнаар бүртгүүлнэ — нас, цагийн хуваарь, үүрэг, эцэг эхийн бичгээр өгсөн зөвшөөрлийн хамт.',
        gap: 'Эдгээр хүүхэд хаана ажиллаж байгааг хэн ч мэдэхгүй.',
        evidence: '10,900 хүүхэд, тэдний 72.8% нь 2–9 ажилтантай газарт.',
      },
      en: {
        change:
          'Register: every employer records each worker under 18 with the local labour office within 7 days of hiring, online, with their age, hours, tasks and a parent’s written consent.',
        gap: 'No one knows where these children work.',
        evidence: '10,900 children, 72.8% of them in workplaces of 2–9 people.',
      },
    },
    {
      mn: {
        change:
          'Шалгалт: бүртгэлтэй ажлын байранд урьдчилан мэдэгдэлгүй шалгалт хийх боломжтой болно.',
        gap: 'Урьдчилан мэдэгдэх журам, цөөн байцаагч хоёр шалгагдах магадлалыг тэгд ойртуулдаг.',
        evidence: 'Ойролцоогоор 1.3 сая ажилтанд 66 байцаагч ногдоно.',
      },
      en: {
        change: 'Inspect: workplaces on the register can be inspected without notice.',
        gap: 'Advance notice and too few inspectors keep the chance of being caught near zero.',
        evidence: '66 inspectors for about 1.3 million workers.',
      },
    },
    {
      mn: {
        change:
          'Торгууль: хуулийн насанд хүрээгүй, 7 хоногт 30 цагаас илүү, аюултай ажилд, эсвэл бүртгэлгүйгээр ажилласан хүүхэд бүрт сарын хамгийн бага цалингийн үржвэрээр тогтоосон торгууль — давтан зөрчилд хоёр дахин нэмэгдэнэ.',
        gap: 'Хамгийн бага насны хязгаарыг зөрчиж хүүхэд ажиллуулсан тохиолдолд ямар ч торгууль байдаггүй.',
        evidence: '82% нь дор хаяж нэг хуулийн хязгаарыг зөрчдөг.',
      },
      en: {
        change:
          'Penalise: a fine for each child employed under age, over 30 hours a week, in hazardous work or unregistered, set as a multiple of the monthly minimum wage and doubled for repeat violations.',
        gap: 'There is no penalty for employing a child under the minimum age.',
        evidence: '82% break at least one legal limit.',
      },
    },
    {
      mn: {
        change: 'Хөнгөн ажлын жагсаалт: төр 13–14 насны хүүхдэд зөвшөөрөгдсөн хөнгөн ажлын жагсаалтыг нийтэлнэ.',
        gap: 'Ажил олгогч, гэр бүл хоёулаа бага насны өсвөр үе юу хийж болохыг мэдэхгүй.',
        evidence: '9.6% нь 13–14 настай бөгөөд 7 хоногт 14 ба түүнээс дээш цаг ажилладаг.',
      },
      en: {
        change:
          'Light work list: the state publishes a list of permitted light work for 13–14-year-olds.',
        gap: 'Employers and families do not know what younger teens are allowed to do.',
        evidence: '9.6% are 13–14 and work 14 or more hours a week.',
      },
    },
    {
      mn: {
        change:
          'Тооллого: хүүхдийн хөдөлмөрийн судалгаа бүр гэр бүлээсээ гадуур ажил олгогчдод ажилладаг хүүхдийг тусдаа үзүүлэлтээр мэдээлж, бүртгэлийн жилийн нийт дүнг нийтэлнэ.',
        gap: 'Энэ бүлэг үндсэн статистикт огт харагддаггүй.',
        evidence: 'Энэ судалгаа тухайн тоог анхдагч өгөгдлөөс өөрөө бүтээхээс өөр аргагүй байсан.',
      },
      en: {
        change:
          'Count: each child labour survey reports children working for outside employers as its own figure, and the register’s yearly totals are published.',
        gap: 'The group is invisible in the headline statistics.',
        evidence: 'This paper had to build the figure from the microdata itself.',
      },
    },
  ],
  seo: {
    mn: {
      title: 'Бодлого — Насанд хүрээгүй ажилтны хамгаалал',
      description:
        'Монголын Хөдөлмөрийн тухай хуульд оруулах таван өөрчлөлт: бүртгэл, шалгалт, торгууль, хөнгөн ажлын жагсаалт, тооллого. Саналын өнөөгийн байдал, огноотой нь.',
    },
    en: {
      title: 'Policy — the Minor Workers Protection Amendment',
      description:
        'Five changes to Mongolia’s Labour Law: register, inspect, penalise, publish a light-work list and count. Where the proposal stands, with its dates and sources.',
    },
  },
  status: 'submitted' as const,
  statusDate: '2026-10-28',
};

/**
 * The published addresses of the sources the methodology names.
 *
 * Every one was opened and confirmed to resolve before being written here —
 * a URL is a fact to be checked, not guessed. The organisation's own case
 * log has no entry because it has no public address, and never will.
 */
const SOURCE_URLS: Record<string, string> = {
  'National Statistics Office of Mongolia (nso.mn)': 'https://nada.nso.mn/en/catalog/58',
  'International Labour Organization (ilo.org)':
    'https://www.ilo.org/publications/child-labour-mongolia-child-labour-survey-results-2021-2022',
  'U.S. Department of Labor, Bureau of International Labor Affairs (dol.gov/agencies/ilab)':
    'https://www.dol.gov/agencies/ilab/resources/reports/child-labor/mongolia',
};

const METHODOLOGY_SEO = {
  mn: {
    title: 'Аргачлал — тоо бүр хэрхэн гарсан бэ',
    description:
      'Нийтэлсэн тоо бүрийн тодорхойлолт, тоолох журам, эх сурвалж, хязгаарлалт. Таваас цөөн хэрэгт тулгуурласан тоог хэзээ ч тоогоор харуулдаггүй.',
  },
  en: {
    title: 'Methodology — how every figure is counted',
    description:
      'The definitions, counting rules, sources and limits behind every figure we publish. A figure resting on fewer than five cases is never shown as a number.',
  },
};

// ── Research paper ──────────────────────────────────────────────────────

const PAPER = {
  slug: 'children-working-for-outside-employers-in-mongolia',
  title: {
    mn: 'Монгол дахь гэр бүлээсээ гадуур ажил олгогчдод ажилладаг хүүхдүүд: 2021–22 оны Үндэсний хүүхдийн хөдөлмөрийн судалгааны нотолгоо',
    en: 'Children Working for Outside Employers in Mongolia: Evidence from the 2021–22 National Child Labour Survey',
  },
  // Matches the PDF's own abstract (page 3) word for word in English, kept
  // in the author's first-person voice rather than paraphrased, since the
  // PDF is the primary source now attached to this entry.
  abstract: {
    mn: [
      'Долоо хоногийн дунджаар Монголд 5–17 насны ойролцоогоор 10,900 хүүхэд өөрийн гэр бүлээс гадна хэн нэгэнд ажилладаг. Тэдний 84% нь хүүхдийн хөдөлмөрт тооцогдож, 82%, өөрөөр хэлбэл ойролцоогоор 8,860 хүүхэд Хөдөлмөрийн тухай хуулийн дор хаяж нэг хязгаарыг зөрчдөг. Би эдгээр хүүхдүүд хэн болох, тэдний ажил өөрийн гэр бүлдээ туслаж байгаа хүүхдүүдийнхээс юугаар ялгаатай болохыг 2021–22 оны Үндэсний хүүхдийн хөдөлмөрийн судалгааны (23,876 хүүхэд, 13,144 өрх) анхдагч өгөгдлийг ашиглан тогтоохоор зорьсон.',
      'Ялгаа нь том байна. Ижил нас, хүйс, аймаг, суурин газрын төрөл, судалгааны улиралтай гэр бүлийн ажилтантай харьцуулахад, гадны ажил олгогчдод ажилладаг хүүхдүүд аюултай ажил хийх магадлал 38.6 нэгж хувиар, 7 хоногт 30 цагаас (хуулийн дээд хязгаар) илүү ажиллах магадлал 32.5 нэгж хувиар өндөр байна. Тэд 7 хоногт 15.3 цагаар илүү ажиллаж, гэртээ 1.4 цагаар бага хичээллэдэг. Цалинтай ажилладаг хүүхдийн 14.3% нь хамгийн бага цагийн хөлсөөс доогуур орлого олдог.',
      'Миний анхны таамаглал бол хүнд хэцүү үе хүүхдийг ажилд түлхэж байгаа гэсэн явдал байв. Гэвч өгөгдөл үүнтэй санал нийлсэнгүй. Орлого буурсан өрхийн 200-гийн 1-ээс бага нь хүүхэд ажиллаж эхэлсэн гэж хэлсэн. Харин өгөгдөл хэнд ч бараг хяналтаар тэнцдэггүй хуулийг илэрхийлж байна. Монголд ойролцоогоор 1.3 сая ажилтанд ногдож 66 хөдөлмөрийн байцаагч байгаа бөгөөд хамгийн бага насны хязгаарыг зөрчиж хүүхэд ажиллуулсан тохиолдолд торгууль байдаггүй. Би насанд хүрээгүй ажилтны бүртгэл, урьдчилан мэдэгдэлгүй шалгалт, хуулиас гадуур ажилласан хүүхэд бүрт торгууль тогтоохыг санал болгож байна.',
    ],
    en: [
      'In an average week, about 10,900 children aged 5–17 in Mongolia work for someone outside their own family. 84% of them are in child labour, and 82%, about 8,860 children, break at least one limit in the Labour Law. I set out to find who these children are and how their work differs from that of children who help their own families, using the microdata of the 2021–22 National Child Labour Survey (23,876 children in 13,144 households).',
      'The difference is large. Compared with family workers of the same age and sex, in the same aimag, type of place and survey quarter, children working for outside employers are 38.6 percentage points more likely to do hazardous work and 32.5 points more likely to work more than 30 hours a week, the legal maximum. They work 15.3 more hours a week and study 1.4 fewer hours a week at home. Of those who are paid, 14.3% earn less than the minimum hourly wage.',
      'My first guess was that hard times push children into work. The data did not agree. Fewer than 1 in 200 households whose income fell said a child started working. What the data points to instead is a law that almost nobody checks. Mongolia has 66 labour inspectors for about 1.3 million workers and no penalty for employing a child under the minimum age. I propose a register of employed minors, unannounced inspections and a fine for each child employed outside the law.',
    ],
  },
  authors: [{ name: 'Erdenebat Batbayar' }],
  year: 2026,
  venue: 'National University of Mongolia, Department of Economics',
  dataUrl: 'https://nada.nso.mn/en/catalog/58',
  status: 'working-paper' as const,
  seoTitle: {
    mn: 'Монгол дахь гадны ажил олгогчдод ажилладаг хүүхдүүд',
    en: 'Children working for outside employers in Mongolia',
  },
  seoDescription: {
    mn: '2021–22 оны Үндэсний хүүхдийн хөдөлмөрийн судалгаанд тулгуурласан, Монголд ажил эрхэлдэг хүүхдүүдийн тухай судалгааны ажил.',
    en: 'A working paper on children working for outside employers in Mongolia, based on the 2021–22 National Child Labour Survey.',
  },
  /**
   * The paper's own headline figures, each naming the passage it is read
   * from so a reader can open the PDF above and check it.
   *
   * These are national survey estimates from a published paper. They are not
   * the organisation's impact figures — those come only from the Google
   * Sheet pipeline and are suppressed below five cases (CLAUDE.md rules 1
   * and 2). Nothing here is ever rendered as an impact figure, and the
   * source line under each one says where it came from.
   *
   * The first three are what the home page shows, so they are ordered to
   * carry the argument: how many there are, how much of it is illegal, and
   * how much more dangerous it is than the work it is compared with.
   */
  findings: [
    {
      mn: {
        value: '10,900',
        label:
          'Долоо хоногийн дунджаар Монголд гэр бүлээсээ гадуур ажил олгогчдод ажилладаг 5–17 насны хүүхэд',
        source: 'Хураангуй, 5.1 бүлэг',
      },
      en: {
        value: '10,900',
        label:
          'Children aged 5–17 in Mongolia working for an employer outside their own family in an average week',
        source: 'Abstract and Section 5.1',
      },
    },
    {
      mn: {
        value: '82%',
        label:
          'Тэдний Хөдөлмөрийн тухай хуулийн дор хаяж нэг хязгаарыг зөрчдөг хувь — ойролцоогоор 8,860 хүүхэд',
        source: '5.2 бүлэг',
      },
      en: {
        value: '82%',
        label:
          'Of them break at least one limit in the Labour Law — about 8,860 children',
        source: 'Section 5.2',
      },
    },
    {
      mn: {
        value: '+38.6 нэгж хувь',
        label:
          'Ижил нас, хүйс, газар, улиралтай гэр бүлийн ажилтантай харьцуулахад аюултай ажил хийх магадлалын зөрүү',
        source: 'Хүснэгт 5.1',
      },
      en: {
        value: '+38.6 pp',
        label:
          'More likely to do hazardous work than a family worker of the same age, sex, place and season',
        source: 'Table 5.1',
      },
    },
    {
      mn: {
        value: '+15.3 цаг',
        label: 'Долоо хоногт илүү ажиллах цаг, ижил нөхцөлтэй гэр бүлийн ажилтантай харьцуулахад',
        source: 'Хүснэгт 5.1',
      },
      en: {
        value: '+15.3 h',
        label: 'More hours worked a week than a comparable family worker',
        source: 'Table 5.1',
      },
    },
    {
      mn: {
        value: '14.3%',
        label:
          'Цалин авдаг хүүхдийн цагийн хамгийн бага хөлс болох 2,500 төгрөгөөс доогуур олдог хувь',
        source: '5.4 бүлэг',
      },
      en: {
        value: '14.3%',
        label: 'Of those paid earn below the minimum of MNT 2,500 an hour',
        source: 'Section 5.4',
      },
    },
    {
      mn: {
        value: '66',
        label:
          'Ойролцоогоор 1.3 сая ажилтанд ногдох хөдөлмөрийн хяналтын байцаагчийн тоо (2024)',
        source: '2-р бүлэг',
      },
      en: {
        value: '66',
        label: 'Labour inspectors for about 1.3 million workers (2024)',
        source: 'Chapter 2',
      },
    },
  ],
  /**
   * Figure 5.1 of the paper: the share of working children exposed to each
   * hazard, by who they work for. Weighted shares, so both columns are
   * percentages of their own group and do not sum to anything.
   *
   * Rows are given in the paper's order; the chart re-sorts them by the size
   * of the gap, so an editor adding a row does not have to think about it.
   */
  comparison: {
    mn: {
      title: 'Аюулын төрөл тус бүрт өртсөн ажил эрхэлдэг хүүхдийн хувь, хэнд ажилладгаар нь',
      groupALabel: 'Гадны ажил олгогчид',
      groupBLabel: 'Өөрийн гэр бүлд',
      note: 'Эх сурвалж: 2021–22 оны Үндэсний хүүхдийн хөдөлмөрийн судалгааны анхдагч өгөгдөл, жигнэсэн, зохиогчийн тооцоо (Зураг 5.1). Түүвэр: гадны ажил олгогчид ажилладаг 294, гэр бүлийн 6,190 хүүхэд — ядрах, бэртэх, хүчирхийллийн үзүүлэлтэд ойролцоогоор 250 ба 5,750.',
    },
    en: {
      title:
        'Share of working children aged 5–17 exposed to each hazard, by who they work for',
      groupALabel: 'Outside employer',
      groupBLabel: 'Own family',
      note: 'Source: National Child Labour Survey 2021–22 microdata, weighted, author’s analysis (Figure 5.1). The sample is 294 outside-employer and 6,190 family workers — about 250 and 5,750 for tiredness, injury and abuse.',
    },
    rows: [
      {
        groupA: 62.7,
        groupB: 25.9,
        mn: 'Аюултай ажил (аль нэг хэлбэрээр)',
        en: 'Hazardous work (any)',
      },
      { groupA: 34, groupB: 3.5, mn: '7 хоногт 30 цагаас илүү', en: 'Over 30 hours a week' },
      { groupA: 46.2, groupB: 24.4, mn: 'Аюултай нөхцөл', en: 'Hazardous condition' },
      { groupA: 14, groupB: 0.3, mn: '16 кг ба түүнээс дээш ачаа', en: 'Load of 16 kg or more' },
      { groupA: 11.7, groupB: 3.2, mn: 'Ажил дээрээ бэртсэн', en: 'Injured at work' },
      {
        groupA: 7.9,
        groupB: 0.1,
        mn: 'Уул уурхай эсвэл барилга',
        en: 'Mining or construction',
      },
      { groupA: 12.6, groupB: 6.8, mn: 'Ажил дээрээ хэт ядарсан', en: 'Too tired at work' },
      {
        groupA: 4.1,
        groupB: 2.9,
        mn: 'Шийтгүүлсэн эсвэл хүчирхийлэлд өртсөн',
        en: 'Punished or abused',
      },
    ],
  },
};

// ── Home page picture ───────────────────────────────────────────────────

const HERO_IMAGE = {
  file: 'workshop-hall.webp',
  // The alt text describes the room, never a person: no school, no names, no
  // ages. "Seen from behind" is the honest description and also the reason
  // this frame is the one that could be published.
  alt: {
    mn: 'Сургуулийн танхимд залуучууд ар талаасаа харагдан, илтгэл сонсож суугаа нь.',
    en: 'Young people seated in a school hall, seen from behind, listening to a presentation.',
  },
} as const;

// ── Partners ────────────────────────────────────────────────────────────

const PARTNERS = [
  {
    name: 'Ministry of Family, Labour and Social Protection',
    url: 'https://mlsp.gov.mn',
    logoFile: 'ministry_logo.webp',
    logoAlt: {
      mn: 'Монгол Улсын Засгийн газрын сүлд',
      en: 'Government of Mongolia emblem',
    },
  },
  {
    name: 'Confederation of Mongolian Trade Unions',
    url: 'https://cmtu.mn',
    logoFile: 'cmtu_log.png',
    logoAlt: {
      mn: 'Монголын Үйлдвэрчний Эвлэлүүдийн Холбооны лого',
      en: 'Confederation of Mongolian Trade Unions logo',
    },
  },
  {
    name: 'Stoic NGO',
    url: 'https://academy.stoic.education',
    logoFile: 'stoic_logo.png',
    logoAlt: { mn: 'Stoic ТББ-ын лого', en: 'Stoic NGO logo' },
  },
  {
    name: 'Federation of Mongolian Education and Science Unions',
    url: undefined,
    logoFile: 'fmesu_logo.webp',
    logoAlt: {
      mn: 'Монголын Боловсрол, Шинжлэх Ухааны Үйлдвэрчний Эвлэлүүдийн Холбооны лого',
      en: 'Federation of Mongolian Education and Science Unions logo',
    },
  },
  {
    // zorigfoundation.org 301s here; this is the address that resolves.
    name: 'Zorig Foundation',
    url: 'https://www.zorigsan.mn',
    logoFile: 'zorigfoundation_logo.jpg',
    logoAlt: { mn: 'Зориг сангийн лого', en: 'Zorig Foundation logo' },
  },
  {
    name: 'Alham Project',
    url: undefined,
    logoFile: 'alham_logo.png',
    logoAlt: { mn: 'Алхам төслийн лого', en: 'Alham Project logo' },
  },
  {
    name: 'NUM Career Center',
    url: 'https://career.num.edu.mn',
    logoFile: 'numcareer_logo.png',
    logoAlt: { mn: 'МУИС Карьерийн төвийн лого', en: 'NUM Career Center logo' },
  },
];

const TEAM = [
  {
    name: 'Erdenebat',
    slug: 'erdenebat',
    role: { mn: 'Үүсгэн байгуулагч, Гүйцэтгэх захирал', en: 'Founder, CEO' },
    // The author page for the paper this site is built around, so a reader
    // who wants the work rather than the claim has somewhere to go.
    profiles: [
      {
        label: { mn: 'ResearchGate', en: 'ResearchGate' },
        url: 'https://www.researchgate.net/profile/Erdenebat-Batbayar-2',
      },
    ],
  },
  {
    name: 'Ariuntuguldur',
    slug: 'ariuntuguldur',
    role: { mn: 'Үйл ажиллагааны менежер', en: 'Operations Lead' },
  },
  {
    name: 'Zolbayar',
    slug: 'zolbayar',
    role: { mn: 'Технологийн захирал', en: 'Chief Technology Officer' },
    profiles: [
      {
        label: { mn: 'Портфолио', en: 'Portfolio' },
        url: 'https://zoloodev-portfolio.vercel.app/',
      },
    ],
  },
];

/**
 * The same profile rows addressed in a second locale.
 *
 * Payload keeps one row per array entry and localizes the fields inside it.
 * An update that leaves out a row's `id` is read as a brand new row, so the
 * first locale's text is dropped along with the row it replaced — which is
 * how "ResearchGate" in English quietly emptied the Mongolian label.
 */
function localeRows(
  saved: { id?: string | null }[] | null | undefined,
  source: { label: { mn: string; en: string }; url: string }[] | undefined,
  locale: 'mn' | 'en',
) {
  return (source ?? []).map((profile, index) => ({
    id: saved?.[index]?.id ?? undefined,
    label: profile.label[locale],
    url: profile.url,
  }));
}

const seed = async () => {
  const payload = await getPayload({ config });
  const { logger } = payload;

  // ── Site ─────────────────────────────────────────────────────────────
  const site = await payload.findGlobal({
    slug: 'site',
    locale: 'mn',
    overrideAccess: true,
  });

  if (needsRealContent(site?.missionLine)) {
    for (const locale of ['mn', 'en'] as const) {
      await payload.updateGlobal({
        slug: 'site',
        locale,
        overrideAccess: true,
        data: {
          missionLine: SITE.missionLine[locale],
          organization: {
            addressCity: SITE.city[locale],
            foundingDate: SITE.foundingDate,
          },
          seo: {
            metaTitle: SITE.seoTitle,
            metaDescription: SITE.seoDescription[locale],
          },
        },
      });
    }
    logger.info('Seeded Site global with real organisation content');
  } else {
    logger.info('Site global mission line already filled in — left untouched');
  }

  // Demo text ("ЖИШЭЭ: ...") in legalName or contactEmail would otherwise
  // render on the About page and in structured data as if it were real —
  // publishable() hides it from metadata/JSON-LD, but the About page reads
  // these fields directly.
  const siteCurrent = await payload.findGlobal({
    slug: 'site',
    locale: 'mn',
    overrideAccess: true,
  });

  if (siteCurrent?.organization?.legalName !== SITE.legalName) {
    for (const locale of ['mn', 'en'] as const) {
      await payload.updateGlobal({
        slug: 'site',
        locale,
        overrideAccess: true,
        data: { organization: { legalName: SITE.legalName } },
      });
    }
    logger.info('Set the real legal name');
  }

  if (siteCurrent?.contactEmail !== SITE.contactEmail) {
    await payload.updateGlobal({
      slug: 'site',
      overrideAccess: true,
      data: { contactEmail: SITE.contactEmail },
    });
    logger.info('Set the real contact email');
  }

  // Legal name and social links were not provided by the client yet, so
  // they are intentionally left as whatever they currently are (TBD
  // placeholder or editor-entered) rather than guessed here.

  // ── Home page picture ────────────────────────────────────────────────
  // One frame out of the photographs the organisation took at a school
  // session. It was chosen and cropped so that no one in it can be
  // recognised — the room is seen from the back and every face is turned
  // away — which is why it can carry `subject: 'none'` honestly and needs
  // no consent record (CLAUDE.md rule 4). The originals are not in the
  // repository: most of them do show faces, and those stay unpublished.
  if (!siteCurrent?.heroImage) {
    const heroPath = path.resolve(process.cwd(), 'public', HERO_IMAGE.file);
    if (existsSync(heroPath)) {
      const heroBytes = await readFile(heroPath);
      const heroMedia = await payload.create({
        collection: 'media',
        overrideAccess: true,
        data: { alt: HERO_IMAGE.alt, subject: 'none' },
        file: {
          data: heroBytes,
          mimetype: 'image/webp',
          name: HERO_IMAGE.file,
          size: heroBytes.length,
        },
      });

      await payload.updateGlobal({
        slug: 'site',
        overrideAccess: true,
        data: { heroImage: heroMedia.id },
      });
      logger.info('Attached the home page picture');
    } else {
      logger.info(`No home page picture at ${heroPath} — skipping`);
    }
  }

  // ── Methodology ──────────────────────────────────────────────────────
  const methodology = await payload.findGlobal({
    slug: 'methodology',
    locale: 'mn',
    overrideAccess: true,
  });

  const hasOnlyPlaceholderDefinitions =
    !methodology?.definitions?.length ||
    (methodology.definitions.length === 1 &&
      needsRealContent(methodology.definitions[0]?.term as string | null));

  if (hasOnlyPlaceholderDefinitions) {
    const mnDefinitions = DEFINITIONS.map(({ anchorId, mn }) => ({ anchorId, ...mn }));
    const mnCountingRules = COUNTING_RULES.map(({ anchorId, mn }) => ({
      anchorId,
      ...mn,
    }));
    const mnSources = SOURCES.map((s) => s.mn);
    const changeLog = [{ date: '2026-11-02', summary: 'Эхний хувилбар.' }];

    await payload.updateGlobal({
      slug: 'methodology',
      locale: 'mn',
      overrideAccess: true,
      data: {
        sources: mnSources,
        definitions: mnDefinitions,
        countingRules: mnCountingRules,
        limitations: richText(LIMITATIONS.mn),
        changeLog,
        seo: { metaTitle: TBD, metaDescription: TBD },
      },
    });

    const saved = await payload.findGlobal({
      slug: 'methodology',
      locale: 'mn',
      overrideAccess: true,
    });

    const enDefinitions = DEFINITIONS.map(({ anchorId, en }) => ({ anchorId, ...en }));
    const enCountingRules = COUNTING_RULES.map(({ anchorId, en }) => ({
      anchorId,
      ...en,
    }));
    const enSources = SOURCES.map((s) => s.en);

    await payload.updateGlobal({
      slug: 'methodology',
      locale: 'en',
      overrideAccess: true,
      data: {
        sources: withIds(enSources, saved?.sources) as never,
        definitions: withIds(enDefinitions, saved?.definitions) as never,
        countingRules: withIds(enCountingRules, saved?.countingRules) as never,
        limitations: richText(LIMITATIONS.en),
        changeLog: withIds(changeLog, saved?.changeLog) as never,
        seo: { metaTitle: TBD, metaDescription: TBD },
      },
    });

    logger.info('Seeded Methodology global with real definitions and counting rules');
  } else {
    logger.info('Methodology global already filled in — left untouched');
  }

  // "What is measured" is written independently of the block above so a
  // database that already had real definitions (from an earlier run of this
  // script) still gets it.
  const methodologyMeasures = await payload.findGlobal({
    slug: 'methodology',
    locale: 'mn',
    overrideAccess: true,
  });

  if (!methodologyMeasures?.measures?.length) {
    const mnMeasures = MEASURES.map((m) => ({
      category: m.category.mn,
      items: m.items.map((i) => ({ label: i.mn })),
    }));

    await payload.updateGlobal({
      slug: 'methodology',
      locale: 'mn',
      overrideAccess: true,
      data: { measures: mnMeasures },
    });

    const savedMeasures = await payload.findGlobal({
      slug: 'methodology',
      locale: 'mn',
      overrideAccess: true,
    });

    const enMeasures = MEASURES.map((m) => ({
      category: m.category.en,
      items: m.items.map((i) => ({ label: i.en })),
    }));

    await payload.updateGlobal({
      slug: 'methodology',
      locale: 'en',
      overrideAccess: true,
      data: {
        measures: withNestedIds(enMeasures, savedMeasures?.measures) as never,
      },
    });

    logger.info('Seeded Methodology global with "what is measured"');
  } else {
    logger.info('Methodology "what is measured" already filled in — left untouched');
  }

  // ── Methodology: the addresses its sources live at ───────────────────
  // A source a reader cannot open is a claim, not a source. Only rows that
  // are still missing a URL are touched, and only ones whose title matches
  // exactly — a renamed row is an editor's decision, not a typo to correct.
  const sourcesNow = await payload.findGlobal({
    slug: 'methodology',
    locale: 'mn',
    overrideAccess: true,
  });
  const sourceRows = sourcesNow?.sources ?? [];
  const missingUrls = sourceRows.filter(
    (row) => !row.url && SOURCE_URLS[row.title as string],
  );

  if (missingUrls.length > 0) {
    await payload.updateGlobal({
      slug: 'methodology',
      locale: 'mn',
      overrideAccess: true,
      data: {
        sources: sourceRows.map((row) => ({
          ...row,
          url: row.url ?? SOURCE_URLS[row.title as string] ?? null,
        })) as never,
      },
    });
    logger.info(`Filled in ${missingUrls.length} source URL(s) on Methodology`);
  } else {
    logger.info('Methodology source URLs already set — left untouched');
  }

  // ── Methodology: SEO ─────────────────────────────────────────────────
  if (needsRealContent(sourcesNow?.seo?.metaTitle)) {
    for (const locale of ['mn', 'en'] as const) {
      await payload.updateGlobal({
        slug: 'methodology',
        locale,
        overrideAccess: true,
        data: {
          seo: {
            metaTitle: METHODOLOGY_SEO[locale].title,
            metaDescription: METHODOLOGY_SEO[locale].description,
          },
        },
      });
    }
    logger.info('Seeded Methodology SEO');
  } else {
    logger.info('Methodology SEO already filled in — left untouched');
  }

  // ── Policy ───────────────────────────────────────────────────────────
  const policy = await payload.findGlobal({
    slug: 'policy',
    locale: 'mn',
    overrideAccess: true,
  });

  if (needsRealContent(policy?.summary)) {
    const mnHistory = POLICY.history.map(({ date, status, mn }) => ({
      date,
      status,
      note: mn,
    }));

    await payload.updateGlobal({
      slug: 'policy',
      locale: 'mn',
      overrideAccess: true,
      data: {
        summary: POLICY.summary.mn,
        fullText: richText(POLICY.fullText.mn),
        status: POLICY.status,
        statusDate: POLICY.statusDate,
        history: mnHistory,
        seo: { metaTitle: TBD, metaDescription: TBD },
      },
    });

    const saved = await payload.findGlobal({
      slug: 'policy',
      locale: 'mn',
      overrideAccess: true,
    });

    const enHistory = POLICY.history.map(({ date, status, en }) => ({
      date,
      status,
      note: en,
    }));

    await payload.updateGlobal({
      slug: 'policy',
      locale: 'en',
      overrideAccess: true,
      data: {
        summary: POLICY.summary.en,
        fullText: richText(POLICY.fullText.en),
        status: POLICY.status,
        statusDate: POLICY.statusDate,
        history: withIds(enHistory, saved?.history) as never,
        seo: { metaTitle: TBD, metaDescription: TBD },
      },
    });

    logger.info('Seeded Policy global with the Minor Workers Protection Amendment');
  } else {
    logger.info('Policy global already filled in — left untouched');
  }

  // ── Policy: the proposal table, and its SEO ──────────────────────────
  // Written separately from the block above so a database seeded by an
  // earlier run of this script still gets them.
  const policyNow = await payload.findGlobal({
    slug: 'policy',
    locale: 'mn',
    overrideAccess: true,
  });

  if (!policyNow?.proposals?.length) {
    const mnProposals = POLICY.proposals.map((p) => p.mn);

    await payload.updateGlobal({
      slug: 'policy',
      locale: 'mn',
      overrideAccess: true,
      data: { proposals: mnProposals },
    });

    const savedProposals = await payload.findGlobal({
      slug: 'policy',
      locale: 'mn',
      overrideAccess: true,
    });

    await payload.updateGlobal({
      slug: 'policy',
      locale: 'en',
      overrideAccess: true,
      data: {
        proposals: withIds(
          POLICY.proposals.map((p) => p.en),
          savedProposals?.proposals,
        ) as never,
      },
    });

    logger.info('Seeded Policy with the five proposed changes and their evidence');
  } else {
    logger.info('Policy proposals already filled in — left untouched');
  }

  if (needsRealContent(policyNow?.seo?.metaTitle)) {
    for (const locale of ['mn', 'en'] as const) {
      await payload.updateGlobal({
        slug: 'policy',
        locale,
        overrideAccess: true,
        data: {
          seo: {
            metaTitle: POLICY.seo[locale].title,
            metaDescription: POLICY.seo[locale].description,
          },
        },
      });
    }
    logger.info('Seeded Policy SEO');
  } else {
    logger.info('Policy SEO already filled in — left untouched');
  }

  // ── Research paper ───────────────────────────────────────────────────
  const existingPaper = await payload.find({
    collection: 'papers',
    where: { slug: { equals: PAPER.slug } },
    limit: 1,
    overrideAccess: true,
  });

  if (existingPaper.totalDocs === 0) {
    const created = await payload.create({
      collection: 'papers',
      locale: 'mn',
      overrideAccess: true,
      data: {
        title: PAPER.title.mn,
        slug: PAPER.slug,
        abstract: richText(PAPER.abstract.mn),
        authors: PAPER.authors,
        year: PAPER.year,
        venue: PAPER.venue,
        dataUrl: PAPER.dataUrl,
        status: PAPER.status,
        seo: { metaTitle: PAPER.seoTitle.mn, metaDescription: PAPER.seoDescription.mn },
      },
      draft: false,
    });

    await payload.update({
      collection: 'papers',
      id: created.id,
      locale: 'en',
      overrideAccess: true,
      data: {
        title: PAPER.title.en,
        abstract: richText(PAPER.abstract.en),
        seo: { metaTitle: PAPER.seoTitle.en, metaDescription: PAPER.seoDescription.en },
      },
      draft: false,
    });

    logger.info(`Created research paper "${PAPER.slug}"`);
  } else {
    logger.info('Research paper already exists — left untouched');

    // The paper was created before venue was captured, and before the
    // abstract was corrected to match the PDF's own wording exactly
    // (it previously paraphrased a secondhand summary). An empty venue is
    // the signal that this sync hasn't run yet — once it has, or an editor
    // has touched the paper in /admin, this leaves it alone.
    const existing = existingPaper.docs[0];
    if (existing && !existing.venue) {
      await payload.update({
        collection: 'papers',
        id: existing.id,
        locale: 'mn',
        overrideAccess: true,
        draft: false,
        data: { abstract: richText(PAPER.abstract.mn), venue: PAPER.venue },
      });
      await payload.update({
        collection: 'papers',
        id: existing.id,
        locale: 'en',
        overrideAccess: true,
        draft: false,
        data: { abstract: richText(PAPER.abstract.en) },
      });
      logger.info('Synced the abstract to the PDF’s own wording, and set venue');
    }
  }

  // The PDF itself is attached separately so re-running this script after
  // the local copy of the file is gone (it only ever lives on disk long
  // enough to upload once) still works — it just skips this step.
  const paperForPdf = await payload.find({
    collection: 'papers',
    where: { slug: { equals: PAPER.slug } },
    limit: 1,
    overrideAccess: true,
  });
  const paperDoc = paperForPdf.docs[0];

  if (paperDoc && !paperDoc.pdf) {
    const pdfPath = path.resolve(
      process.cwd(),
      'Batbayar_Children_Outside_Employers_NUM.pdf',
    );
    if (existsSync(pdfPath)) {
      const pdfBytes = await readFile(pdfPath);
      const pdfMedia = await payload.create({
        collection: 'media',
        overrideAccess: true,
        data: {
          alt: {
            mn: `${PAPER.title.mn} — PDF`,
            en: `${PAPER.title.en} — PDF`,
          },
          subject: 'none',
        },
        file: {
          data: pdfBytes,
          mimetype: 'application/pdf',
          name: 'children-working-for-outside-employers-in-mongolia.pdf',
          size: pdfBytes.length,
        },
      });

      await payload.update({
        collection: 'papers',
        id: paperDoc.id,
        overrideAccess: true,
        draft: false,
        data: { pdf: pdfMedia.id },
      });

      logger.info('Attached the research paper PDF (metadata stripped on upload)');
    } else {
      logger.info(
        `No local PDF found at ${pdfPath} — skipping attach (already done, or not provided yet)`,
      );
    }
  } else if (paperDoc?.pdf) {
    logger.info('Research paper already has a PDF attached — left untouched');
  }

  // ── The paper's own findings, and its comparison chart ───────────────
  // Sits before the citation block below so the forced publish at the end
  // covers these writes too.
  const paperForFindings = await payload.find({
    collection: 'papers',
    where: { slug: { equals: PAPER.slug } },
    limit: 1,
    overrideAccess: true,
  });
  const findingsPaper = paperForFindings.docs[0];

  if (findingsPaper && !findingsPaper.findings?.length) {
    await payload.update({
      collection: 'papers',
      id: findingsPaper.id,
      locale: 'mn',
      overrideAccess: true,
      draft: false,
      data: {
        findings: PAPER.findings.map((f) => f.mn),
        comparison: {
          ...PAPER.comparison.mn,
          rows: PAPER.comparison.rows.map((row) => ({
            label: row.mn,
            groupA: row.groupA,
            groupB: row.groupB,
          })),
        },
      },
    });

    const savedPaper = await payload.findByID({
      collection: 'papers',
      id: findingsPaper.id,
      locale: 'mn',
      overrideAccess: true,
    });

    await payload.update({
      collection: 'papers',
      id: findingsPaper.id,
      locale: 'en',
      overrideAccess: true,
      draft: false,
      data: {
        findings: withIds(
          PAPER.findings.map((f) => f.en),
          savedPaper?.findings,
        ) as never,
        comparison: {
          ...PAPER.comparison.en,
          rows: withIds(
            PAPER.comparison.rows.map((row) => ({
              label: row.en,
              groupA: row.groupA,
              groupB: row.groupB,
            })),
            savedPaper?.comparison?.rows,
          ) as never,
        },
      },
    });

    logger.info(
      `Seeded ${PAPER.findings.length} key findings and the ${PAPER.comparison.rows.length}-row comparison chart`,
    );
  } else if (findingsPaper?.findings?.length) {
    logger.info('Paper findings already filled in — left untouched');
  }

  // ── Point the policy at the paper it rests on ────────────────────────
  const policyBase = await payload.findGlobal({
    slug: 'policy',
    locale: 'mn',
    overrideAccess: true,
    depth: 0,
  });

  if (findingsPaper && !policyBase?.basedOn) {
    await payload.updateGlobal({
      slug: 'policy',
      overrideAccess: true,
      data: { basedOn: findingsPaper.id },
    });
    logger.info('Linked the policy proposal to the paper it rests on');
  }

  // citations is localized (it quotes the localized title), but the
  // beforeChange hook that fills it in only reliably sees the current
  // locale's title when that locale's update explicitly includes it. Any
  // update that patches only other fields (abstract sync, PDF attach) can
  // leave one locale's citation empty or stale — so re-touch title per
  // locale here, unconditionally, to guarantee both are correct.
  const paperForCitations = await payload.find({
    collection: 'papers',
    where: { slug: { equals: PAPER.slug } },
    limit: 1,
    overrideAccess: true,
  });
  const citationPaperId = paperForCitations.docs[0]?.id;
  if (citationPaperId) {
    for (const locale of ['mn', 'en'] as const) {
      await payload.update({
        collection: 'papers',
        id: citationPaperId,
        locale,
        overrideAccess: true,
        draft: false,
        data: { title: PAPER.title[locale] },
      });
    }
    logger.info('Recomputed citations for both locales');

    // Payload's Local API update() with draft:false has not reliably kept
    // this document published across these locale-scoped partial updates —
    // empirically confirmed: it silently reverts _status to 'draft', which
    // makes getPapers()'s `_status: published` filter drop it entirely (the
    // page then renders "Nothing here yet" despite the data being correct).
    // Forcing it directly is the reliable fix; versions/drafts stay on.
    const db = (
      payload.db as unknown as {
        drizzle: { execute: (q: unknown) => Promise<unknown> };
      }
    ).drizzle;
    await db.execute(
      sql`update papers set _status = 'published' where id = ${citationPaperId}`,
    );
    logger.info('Forced the paper back to published');
  }

  // ── Partners ─────────────────────────────────────────────────────────
  for (const partner of PARTNERS) {
    const existing = await payload.find({
      collection: 'partners',
      where: { name: { equals: partner.name } },
      limit: 1,
      overrideAccess: true,
    });

    if (existing.totalDocs === 0) {
      await payload.create({
        collection: 'partners',
        overrideAccess: true,
        data: { name: partner.name, url: partner.url },
      });
      logger.info(`Created partner "${partner.name}"`);
    } else {
      logger.info(`Partner "${partner.name}" already exists — left untouched`);

      // Except for an address that arrived after the row did — several
      // partners were seeded before their website was known. Only filled
      // when there is none, so an editor who corrected a URL by hand does
      // not find this script putting the old one back.
      const current = existing.docs[0];
      if (partner.url && current && !current.url) {
        await payload.update({
          collection: 'partners',
          id: current.id,
          overrideAccess: true,
          data: { url: partner.url },
        });
        logger.info(`Set the website address for "${partner.name}"`);
      }
    }

    if ('logoFile' in partner && partner.logoFile) {
      const current = await payload.find({
        collection: 'partners',
        where: { name: { equals: partner.name } },
        limit: 1,
        overrideAccess: true,
      });
      const partnerDoc = current.docs[0];
      if (partnerDoc && !partnerDoc.logo) {
        const logoPath = path.resolve(process.cwd(), 'public', partner.logoFile);
        if (existsSync(logoPath)) {
          const logoBytes = await readFile(logoPath);
          const mimetype = partner.logoFile.endsWith('.webp')
            ? 'image/webp'
            : partner.logoFile.endsWith('.jpg')
              ? 'image/jpeg'
              : 'image/png';
          const logoMedia = await payload.create({
            collection: 'media',
            locale: 'mn',
            overrideAccess: true,
            data: {
              alt: { mn: partner.logoAlt!.mn, en: partner.logoAlt!.en },
              subject: 'none',
            },
            file: {
              data: logoBytes,
              mimetype,
              name: partner.logoFile,
              size: logoBytes.length,
            },
          });

          await payload.update({
            collection: 'partners',
            id: partnerDoc.id,
            overrideAccess: true,
            data: { logo: logoMedia.id },
          });
          logger.info(`Attached logo for "${partner.name}"`);
        } else {
          logger.info(
            `No local logo file for "${partner.name}" at ${logoPath} — skipping`,
          );
        }
      }
    }
  }

  // ── Team ─────────────────────────────────────────────────────────────
  // confirmedAdult18Plus is required to save or list a Team row at all
  // (CLAUDE.md rule 4): these are named leadership roles (CEO, Operations
  // Lead, CTO), not members, so the confirmation is safe to set here.
  for (const member of TEAM) {
    const existing = await payload.find({
      collection: 'team',
      where: { name: { equals: member.name } },
      limit: 1,
      overrideAccess: true,
    });

    if (existing.totalDocs === 0) {
      const created = await payload.create({
        collection: 'team',
        locale: 'mn',
        overrideAccess: true,
        data: {
          name: member.name,
          slug: member.slug,
          role: member.role.mn,
          confirmedAdult18Plus: true,
          profiles: member.profiles?.map((profile) => ({
            label: profile.label.mn,
            url: profile.url,
          })),
        },
      });

      await payload.update({
        collection: 'team',
        id: created.id,
        locale: 'en',
        overrideAccess: true,
        data: {
          role: member.role.en,
          // The row ids from the Mongolian write, so this updates those rows
          // instead of replacing them. An array row written without its id is
          // a new row, and the label just saved in the other locale goes with
          // the row it replaced.
          profiles: localeRows(created.profiles, member.profiles, 'en'),
        },
      });

      logger.info(`Created team member "${member.name}"`);
    } else {
      logger.info(`Team member "${member.name}" already exists — left untouched`);
    }

    // Members created before the slug field existed have none, and without
    // one their page has no address. Filled in once, then left alone: the
    // slug is the URL, and changing it later breaks every link to it.
    {
      const current = await payload.find({
        collection: 'team',
        where: { name: { equals: member.name } },
        limit: 1,
        overrideAccess: true,
      });
      const memberDoc = current.docs[0];

      if (memberDoc && !memberDoc.slug) {
        await payload.update({
          collection: 'team',
          id: memberDoc.id,
          overrideAccess: true,
          data: { slug: member.slug },
        });
        logger.info(`Set the slug for "${member.name}"`);
      }
    }

    // Profiles are attached separately, because a member created by an
    // earlier run of this script predates the field. Only ever added when
    // the member has none: an editor who removed a link on purpose should
    // not find it back after the next seed.
    if (member.profiles?.length) {
      const current = await payload.find({
        collection: 'team',
        where: { name: { equals: member.name } },
        limit: 1,
        overrideAccess: true,
      });
      const memberDoc = current.docs[0];

      if (memberDoc && !memberDoc.profiles?.length) {
        const withMn = await payload.update({
          collection: 'team',
          id: memberDoc.id,
          locale: 'mn',
          overrideAccess: true,
          data: {
            profiles: member.profiles.map((profile) => ({
              label: profile.label.mn,
              url: profile.url,
            })),
          },
        });

        await payload.update({
          collection: 'team',
          id: memberDoc.id,
          locale: 'en',
          overrideAccess: true,
          data: { profiles: localeRows(withMn.profiles, member.profiles, 'en') },
        });

        logger.info(`Attached professional profiles for "${member.name}"`);
      }
    }
  }

  // No photos were given for anyone above — never invented, per CLAUDE.md
  // rule 4. Logos and member photos still need to come through /admin.
  logger.info('Organisation content seed complete.');
};

await seed();
process.exit(0);
