// OpenRouter, two endpoint styles, no SDK:
//   • /api/v1/chat/completions — OpenAI-shaped text generation
//   • /api/v1/systemone        — typed decisions (the shape OpenCode Zen exposes for Jev)
// Anything that speaks SystemOne can be pointed at `SYSTEMONE_ENDPOINT` below,
// which is how the decision model can run on either provider.

import { getOpenRouterKey, readSettings } from './modelConfig';

const V1_BASE = 'https://openrouter.ai/api/v1';
const CHAT_ENDPOINT = `${V1_BASE}/chat/completions`;
export const SYSTEMONE_ENDPOINT = `${V1_BASE}/systemone`;

const CHAT_TIMEOUT_MS = 25000;

export const isOpenRouterAvailable = (s = readSettings()): boolean => Boolean(getOpenRouterKey(s));

interface ChatOptions {
  model: string;
  prompt: string;
  system?: string;
  json?: boolean;
  temperature?: number;
  signal?: AbortSignal;
}

export const openRouterChat = async ({
  model,
  prompt,
  system,
  json = false,
  temperature = 0.7,
  signal,
}: ChatOptions): Promise<string | null> => {
  const apiKey = getOpenRouterKey();
  if (!apiKey) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CHAT_TIMEOUT_MS);
  signal?.addEventListener('abort', () => ctrl.abort(), { once: true });

  try {
    const res = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://zournel.app',
        'X-Title': 'Zournel',
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: prompt },
        ],
        temperature,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.warn(`OpenRouter ${res.status}:`, (await res.text().catch(() => '')).slice(0, 200));
      return null;
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (err: any) {
    console.warn('OpenRouter request failed:', err?.message || err);
    return null;
  } finally {
    clearTimeout(timer);
  }
};
