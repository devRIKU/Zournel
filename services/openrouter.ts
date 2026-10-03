// OpenRouter, two endpoint styles, no SDK:
//   • /api/v1/chat/completions — OpenAI-shaped text generation
//   • /api/v1/systemone        — typed decisions (the shape OpenCode Zen exposes for Jev)
// Anything that speaks SystemOne can be pointed at `SYSTEMONE_ENDPOINT` below,
// which is how the decision model can run on either provider.

import { ModelOption, getOpenRouterKey, presetsFor, readModelCache, readSettings, writeModelCache } from './modelConfig';

const V1_BASE = 'https://openrouter.ai/api/v1';
const CHAT_ENDPOINT = `${V1_BASE}/chat/completions`;
const MODELS_ENDPOINT = `${V1_BASE}/models`;
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

// --- model catalogue -------------------------------------------------------------------------
// Public endpoint: no key needed, so the list is available before the user has configured one.

const price = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

/** Free = every price OpenRouter quotes for the model is zero. */
const isFreeModel = (pricing: Record<string, unknown> | undefined): boolean => {
  const values = Object.values(pricing || {});
  return values.length > 0 && values.every(v => price(v) === 0);
};

let catalogRequest: Promise<ModelOption[]> | null = null;

export const fetchOpenRouterModels = async (force = false): Promise<ModelOption[]> => {
  if (!force) {
    const cached = readModelCache('openrouter');
    if (cached) return cached;
  }
  if (catalogRequest) return catalogRequest;

  catalogRequest = (async () => {
    try {
      const res = await fetch(MODELS_ENDPOINT, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`OpenRouter models ${res.status}`);
      const data = await res.json();
      const models: ModelOption[] = (data?.data || [])
        .filter((m: any) => typeof m?.id === 'string')
        .map((m: any) => ({
          id: m.id,
          label: m.name || m.id,
          free: isFreeModel(m.pricing),
        }))
        // free models first, then alphabetical — the free tier is what most people want
        .sort((a: ModelOption, b: ModelOption) =>
          a.free === b.free ? a.label.localeCompare(b.label) : a.free ? -1 : 1
        );
      if (!models.length) throw new Error('OpenRouter returned no models');
      writeModelCache('openrouter', models);
      return models;
    } catch (err) {
      console.warn('Could not load OpenRouter models:', (err as any)?.message || err);
      return presetsFor('openrouter');
    } finally {
      catalogRequest = null;
    }
  })();

  return catalogRequest;
};
