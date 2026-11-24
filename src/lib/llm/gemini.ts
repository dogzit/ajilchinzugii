/**
 * Google Gemini, called over REST with `fetch` so the same code runs on Node
 * and on Workers, with no SDK in the bundle.
 *
 * Key and model come from the environment only (CLAUDE.md rule 10): the
 * model id is never written into code, so moving to a newer model is an env
 * change. With either missing, the callers fall back to their mock or
 * template and the site keeps working without an LLM.
 *
 * Terms: the Gemini API terms bar services "likely to be accessed by
 * individuals under the age of 18", and on unpaid keys Google trains on the
 * content. See docs/rater/open-questions.md before production.
 */

export type LlmConfig = { apiKey: string; model: string };

export function llmConfig(env: Record<string, string | undefined> = process.env): LlmConfig | null {
  const apiKey = env.GEMINI_API_KEY?.trim();
  const model = env.GEMINI_MODEL?.trim();
  return apiKey && model ? { apiKey, model } : null;
}

/** Thrown when the model returns nothing usable. Never carries the request or response text. */
export class LlmUnavailable extends Error {
  constructor(public readonly reason: 'refusal' | 'empty' | 'invalid' | 'error') {
    super(`LLM unavailable: ${reason}`);
  }
}

type GenerateInput = {
  system: string;
  user: string;
  /** A JSON Schema: the answer is then JSON of that shape. */
  schema?: object;
  thinking: 'LOW' | 'MEDIUM';
  maxOutputTokens: number;
};

const BLOCKED = new Set(['SAFETY', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'RECITATION']);

export async function generate(config: LlmConfig, input: GenerateInput): Promise<string> {
  let body: {
    promptFeedback?: { blockReason?: string };
    candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': config.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.system }] },
          contents: [{ role: 'user', parts: [{ text: input.user }] }],
          generationConfig: {
            maxOutputTokens: input.maxOutputTokens,
            thinkingConfig: { thinkingLevel: input.thinking },
            ...(input.schema ? { responseMimeType: 'application/json', responseJsonSchema: input.schema } : {}),
          },
        }),
        // A reader is waiting on the other end of every call.
        signal: AbortSignal.timeout(90_000),
      },
    );
    if (!response.ok) throw new Error(String(response.status));
    body = await response.json();
  } catch {
    // Never rethrow: an error message can quote the request.
    throw new LlmUnavailable('error');
  }
  if (body.promptFeedback?.blockReason) throw new LlmUnavailable('refusal');
  const candidate = body.candidates?.[0];
  if (candidate?.finishReason && BLOCKED.has(candidate.finishReason)) throw new LlmUnavailable('refusal');
  const text = (candidate?.content?.parts ?? [])
    .filter((part) => !part.thought)
    .map((part) => part.text ?? '')
    .join('')
    .trim();
  if (!text) throw new LlmUnavailable('empty');
  return text;
}
