import { generate, llmConfig, type LlmConfig } from '../llm/gemini';

/**
 * The message to the employer: one of the two things the LLM may write
 * (spec, "What the LLM may write"). It is built from the failed rules only —
 * their titles, articles, explanations and the facts the engine found — and
 * never from the contract text or anything that identifies the worker. The
 * site never sends it; the reader copies it.
 */

export type FailedRule = {
  title: string;
  article: string | null;
  explanation: string;
  facts: string[];
};

export type MessageInput = {
  failed: FailedRule[];
  /** "18 хүрээгүй ажилтан" or nothing: whether the minor rules apply. */
  minor: boolean;
  /** Strings for the template fallback, in Mongolian (rater.employerMessage in mn.json). */
  template: { greeting: string; intro: string; minorIntro: string; closing: string; signature: string; article: string };
};

export interface MessageWriter {
  write(input: MessageInput): Promise<{ text: string; source: 'ai' | 'template' }>;
}

const articleLine = (rule: FailedRule, label: string) => (rule.article ? ` (${label.replace('{article}', rule.article)})` : '');

/** Deterministic: used with no key, in tests and CI, and whenever the model is unavailable. */
export const templateWriter: MessageWriter = {
  async write({ failed, minor, template }) {
    const lines = [
      template.greeting,
      '',
      minor ? template.minorIntro : template.intro,
      '',
      ...failed.map((rule, index) => `${index + 1}. ${rule.title}${articleLine(rule, template.article)}. ${rule.explanation}`),
      '',
      template.closing,
      '',
      template.signature,
    ];
    return { text: lines.join('\n'), source: 'template' };
  },
};

const SYSTEM = [
  'Та ажилтны нэрийн өмнөөс ажил олгогчид хандсан эелдэг, товч захидлыг монгол хэлээр бичнэ.',
  'Зөвхөн хэрэглэгчийн мессежид жагсаасан асуудлуудыг, жагсаасан дарааллаар нь дурд.',
  'Хуулийн зүйл, заалтыг яг өгсөн хэлбэрээр нь иш тат. Шинэ зүйл, заалт, тоо, огноо, нэр, баримт бүү зохио.',
  'Хууль зүйн шинэ дүгнэлт бүү нэм; асуудал бүрийг засахыг хүсэлтээр илэрхийл.',
  'Ажилтны нэр, хаяг, утсыг бичихгүй — гарын үсгийн мөрөнд «[Таны нэр]» гэж үлдээ.',
  'Захидлын текстийг л буцаа: гарчиг, тайлбар, markdown тэмдэглэгээгүй.',
].join('\n');

function userPrompt(input: MessageInput): string {
  return [
    input.minor ? 'Ажилтан 18 нас хүрээгүй.' : 'Ажилтан 18 ба түүнээс дээш настай.',
    '',
    'Засуулах асуудлууд:',
    ...input.failed.map(
      (rule, index) =>
        `${index + 1}. ${rule.title}${rule.article ? ` — Хөдөлмөрийн тухай хууль, ${rule.article}` : ''}\n   ${rule.explanation}${rule.facts.length ? `\n   Олдсон зүйл: ${rule.facts.join('; ')}` : ''}`,
    ),
  ].join('\n');
}

export function geminiWriter(config: LlmConfig): MessageWriter {
  return {
    async write(input) {
      const text = await generate(config, { system: SYSTEM, user: userPrompt(input), thinking: 'LOW', maxOutputTokens: 4000 });
      return { text, source: 'ai' };
    },
  };
}

/** The live writer when the LLM is configured, else the template. A failed live call falls back to the template. */
export async function writeEmployerMessage(
  input: MessageInput,
  env: Record<string, string | undefined> = process.env,
): Promise<{ text: string; source: 'ai' | 'template' }> {
  const config = llmConfig(env);
  if (!config) return templateWriter.write(input);
  try {
    return await geminiWriter(config).write(input);
  } catch {
    return templateWriter.write(input);
  }
}
