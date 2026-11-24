// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import en from '../../messages/tools/en.json';
import mn from '../../messages/tools/mn.json';
import { POST as ratePOST } from '../../src/app/api/rater/rate/route';
import { rate } from '../../src/lib/rater/engine';
import { templateWriter, writeEmployerMessage } from '../../src/lib/rater/employer-message';
import { fill, renderDetail } from '../../src/lib/rater/present';
import { answersToFields } from '../../src/lib/rater/questionnaire';
import { ruleSet } from '../../src/lib/rater/rule-set';
import { buildTemplate } from '../../src/lib/rater/template';
import { renderTemplatePdf } from '../../src/lib/rater/template-pdf';
import { adultDoc, make, minorDoc, RATED_ON, testLists } from '../fixtures/rater';
import { scenarios } from '../fixtures/rater-scenarios';

const allRatings = [
  ...scenarios.map((s) => rate(answersToFields(s.answers), s.date ?? RATED_ON, s.lists ? testLists : ruleSet)),
  rate(minorDoc(), RATED_ON),
  rate(adultDoc(), RATED_ON),
  rate(make(adultDoc, (f) => { f.flagged_clauses = [{ category: 'deposit', excerpt: 'барьцаа', page: 1 }]; f.job.location_listed = false; }), RATED_ON),
];

describe('every detail the engine emits has words in both languages', () => {
  const details = allRatings.flatMap((r) => r.results.flatMap((x) => x.details));

  it.each([
    ['mn', mn.rater],
    ['en', en.rater],
  ] as const)('%s', (_, dict) => {
    for (const detail of details) {
      expect(dict.details, detail.key).toHaveProperty(detail.key);
      const sentence = renderDetail(detail, dict, 'mn');
      expect(sentence, detail.key).not.toMatch(/\{\w+\}/);
    }
  });
});

describe('the corrected template', () => {
  const t = (key: string, values?: Record<string, string | number>) => {
    const value = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], mn.rater.template);
    return fill(String(value), values);
  };

  const unlawfulMinor = make(minorDoc, (f) => {
    f.schedule = { ...f.schedule, hours_per_day: 9, days_per_week: 6, hours_per_week: 54, start_time: '14:00', end_time: '23:30', lunch_break_min: 15 };
    f.pay = { ...f.pay, amount: 2000, unit: 'hour', payments_per_month: 1 };
    f.probation = { months: 6, extension_months: null, pay_amount: null };
    f.leave.annual_days = 5;
  });
  const doc = buildTemplate(unlawfulMinor, RATED_ON, ruleSet, t, 'mn');
  const text = doc.sections.flatMap((s) => s.lines).join('\n');

  it('caps a minor at 30 hours, 5 days, and keeps the shift out of the night', () => {
    expect(text).toContain('Долоо хоногт 5 өдөр, өдөрт 6 цаг; долоо хоногт нийт 30 цагаас ихгүй.');
    const [, end] = /Ажлын цаг (\d\d:\d\d)–(\d\d:\d\d)/.exec(text)?.slice(1) ?? [];
    expect(end && end <= '22:00').toBe(true);
  });

  it('raises pay to the minimum, pays twice a month, trims the trial and the leave', () => {
    expect(text).toContain('төгрөгөөс багагүй');
    expect(text).toContain('сард 2 удаа');
    expect(text).toContain('Туршилтын хугацаа 3 сар');
    expect(text).toContain('Жилд 15 ажлын өдрөөс');
  });

  it('adds the guardian and the minor protections, and prints nothing personal', () => {
    expect(text).toContain('Эцэг эх / асран хамгаалагч');
    expect(text).toContain('6 сар тутам');
    expect(text).not.toContain('2010-03-14');
  });

  it('renders a PDF', async () => {
    const pdf = await renderTemplatePdf(doc);
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(2000);
  });
});

describe('the employer message', () => {
  afterEach(() => vi.unstubAllGlobals());

  const input = {
    minor: true,
    failed: [{ title: 'Шөнийн ажил', article: '88.1, 88.6', explanation: 'x', facts: ['Ажлын цаг: 17:30–22:30.'] }],
    template: mn.rater.employerMessage,
  };

  it('falls back to the template with no key, citing the article', async () => {
    const result = await writeEmployerMessage(input, {});
    expect(result.source).toBe('template');
    expect(result.text).toContain('Хөдөлмөрийн тухай хууль, 88.1, 88.6');
    expect(result.text).toContain('18 нас хүрээгүй');
  });

  it('falls back to the template when the API fails, without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"type":"error"}', { status: 500 })));
    const result = await writeEmployerMessage(input, { ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_MODEL: 'test-model' });
    expect(result.source).toBe('template');
  });

  it('sends the model rule texts and facts only — no fields', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: unknown, init?: RequestInit) => {
        calls.push(String(init?.body));
        return Response.json({
          id: 'msg_1',
          type: 'message',
          role: 'assistant',
          model: 'test-model',
          content: [{ type: 'text', text: 'Сайн байна уу. ...' }],
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        });
      }),
    );
    const result = await writeEmployerMessage(input, { ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_MODEL: 'test-model' });
    expect(result.source).toBe('ai');
    const body = JSON.parse(calls[0]!);
    expect(body.model).toBe('test-model');
    expect(body).not.toHaveProperty('temperature');
    expect(JSON.stringify(body.messages)).toContain('88.1, 88.6');
    expect(JSON.stringify(body.messages)).not.toMatch(/date_of_birth|evidence/);
  });

  it('the template is deterministic', async () => {
    expect((await templateWriter.write(input)).text).toBe((await templateWriter.write(input)).text);
  });
});

describe('POST /api/rater/rate', () => {
  const post = (body: unknown) =>
    ratePOST(new Request('http://x/api/rater/rate', { method: 'POST', body: JSON.stringify(body) }));

  it('rates valid fields on the server', async () => {
    const response = await post({ fields: minorDoc() });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const rating = await response.json();
    expect(rating.ruleSetVersion).toBe(ruleSet.version);
    expect(rating.results.length).toBeGreaterThan(10);
  });

  it('refuses a broken body without echoing it', async () => {
    const response = await post({ fields: { secret: 'Батбаяр 99112233' } });
    expect(response.status).toBe(422);
    expect(await response.text()).not.toContain('Батбаяр');
  });

  it('ignores any verdict or score the browser sends', async () => {
    const response = await post({ fields: { ...minorDoc(), verdict: 'green', score: 100 }, score: 100 });
    const rating = await response.json();
    expect(rating.verdict).toBe('yellow'); // M08 is unknown until A/122 arrives
  });
});
