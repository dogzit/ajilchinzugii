import Anthropic from '@anthropic-ai/sdk';

/**
 * The Anthropic client, configured from env only (CLAUDE.md rule 10).
 *
 * Both the key and the model come from the environment — the model id is
 * never written into code, so moving to a newer model is an env change. With
 * either missing, the callers fall back to their mock adapters and the site
 * keeps working without an LLM.
 *
 * The SDK talks over `fetch`, so the same code runs on Node and on Workers.
 */

export type LlmConfig = { apiKey: string; model: string };

export function llmConfig(env: Record<string, string | undefined> = process.env): LlmConfig | null {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  const model = env.ANTHROPIC_MODEL?.trim();
  return apiKey && model ? { apiKey, model } : null;
}

export function anthropicClient(config: LlmConfig): Anthropic {
  // One retry: a reader is waiting on the other end of every call.
  return new Anthropic({ apiKey: config.apiKey, maxRetries: 1, timeout: 90_000 });
}

/**
 * Server-side refusal fallback: if the model declines, the API reruns the
 * request on a fallback model inside the same call. Opt-in, so it is set on
 * every request here.
 */
export const fallback = (): { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: 'default' } => ({
  betas: ['server-side-fallback-2026-07-01'],
  fallbacks: 'default',
});

/** Thrown when the model returns nothing usable. Never carries the request or response text. */
export class LlmUnavailable extends Error {
  constructor(public readonly reason: 'refusal' | 'empty' | 'invalid' | 'error') {
    super(`LLM unavailable: ${reason}`);
  }
}
