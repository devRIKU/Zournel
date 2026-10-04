import { AppSettings, DecisionProvider, ModelSlot, ModelTier } from '../types';

/**
 * One place that knows: which tiers exist, which models each provider offers,
 * which keys are configured, and how a tier resolves to a concrete model.
 *
 * Call sites pass a tier id ('ember' | 'lantern' | 'beacon'); this file decides
 * whether that means Gemini or OpenRouter today.
 */

export const SETTINGS_KEY = 'mf_settings';

export const TIERS: readonly { id: ModelTier; name: string; tag: string; desc: string }[] = [
  { id: 'ember', name: 'Ember', tag: 'Fast & light', desc: 'Instant touches: mood tags, titles, quick polish.' },
  { id: 'lantern', name: 'Lantern', tag: 'Everyday', desc: 'The default companion: chat, insights, subtasks.' },
  { id: 'beacon', name: 'Beacon', tag: 'Deep & far-reaching', desc: 'Long reflections and careful reasoning.' },
];

export const DEFAULT_TIER: ModelTier = 'lantern';

export const GEMINI_MODELS = [
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' },
  { id: 'gemma-4-31b-it', label: 'Gemma 4-31B-it' },
];

// Any OpenRouter id works — this is just a shortlist of cheap, well-behaved ones.
export const OPENROUTER_MODELS = [
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini' },
  { id: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku' },
  { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3' },
];

export const modelsFor = (provider: ModelSlot['provider']) =>
  provider === 'openrouter' ? OPENROUTER_MODELS : GEMINI_MODELS;

/** A model the user can pick: fetched live from a provider, or a bundled preset. */
export interface ModelOption {
  id: string;
  label: string;
  /** OpenRouter only: every price is zero. */
  free?: boolean;
}

export const presetsFor = (provider: ModelSlot['provider']): ModelOption[] =>
  modelsFor(provider).map(m => ({ id: m.id, label: m.label }));

// Model catalogues are big and change rarely — cache them locally for a while.
export const MODEL_CACHE_TTL = 6 * 60 * 60 * 1000;
const modelCacheKey = (kind: string) => `zournel_models_${kind}`;

export const readModelCache = (kind: string): ModelOption[] | null => {
  try {
    const raw = JSON.parse(localStorage.getItem(modelCacheKey(kind)) || 'null');
    if (!raw || Date.now() - raw.t > MODEL_CACHE_TTL || !Array.isArray(raw.models)) return null;
    return raw.models;
  } catch {
    return null;
  }
};

export const writeModelCache = (kind: string, models: ModelOption[]) => {
  try {
    localStorage.setItem(modelCacheKey(kind), JSON.stringify({ t: Date.now(), models }));
  } catch {}
};

export const DEFAULT_TIERS: Record<ModelTier, ModelSlot> = {
  ember: { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
  lantern: { provider: 'gemini', model: 'gemini-3.8-flash' },
  beacon: { provider: 'gemini', model: 'gemma-4-31b-it' },
};

export const DEFAULT_DECISION_MODEL = 'inception/mercury-decide:free';
export const DEFAULT_ZEN_DECISION_MODEL = 'jev-1.13-free';

export const defaultDecisionModelFor = (provider: DecisionProvider): string =>
  provider === 'openrouter' ? DEFAULT_DECISION_MODEL : DEFAULT_ZEN_DECISION_MODEL;

/** Where a pre-tier `settings.model` lands once it's migrated into a slot. */
const LEGACY_TIER: Record<string, ModelTier> = {
  'gemini-3.1-flash-lite': 'ember',
  'gemini-3.5-flash-lite': 'ember',
  'gemini-3.8-flash': 'lantern',
  'gemini-3.6-flash': 'lantern',
  'gemma-4-31b-it': 'beacon',
};

export const readSettings = (): Partial<AppSettings> => {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {};
  } catch {
    return {};
  }
};

const env = (key: string): string => {
  const meta = (import.meta as any)?.env ?? {};
  return (
    (typeof process !== 'undefined' && (process as any).env?.[key]) ||
    meta[key] ||
    meta[`VITE_${key}`] ||
    (typeof window !== 'undefined' && (window as any)[key]) ||
    ''
  );
};

const firstNonEmpty = (...vals: (string | undefined | null)[]) =>
  (vals.find(v => typeof v === 'string' && v.trim().length > 0) || '').trim();

export const getGeminiKey = (s: Partial<AppSettings> = readSettings()): string =>
  firstNonEmpty(s.apiKey, env('GEMINI_API_KEY'), env('API_KEY'));

export const getOpenRouterKey = (s: Partial<AppSettings> = readSettings()): string =>
  firstNonEmpty(s.openrouterApiKey, env('OPENROUTER_API_KEY'));

export const getZenKey = (s: Partial<AppSettings> = readSettings()): string =>
  firstNonEmpty(s.opencodeApiKey, env('OPENCODE_API_KEY'));

export const hasKey = (provider: ModelSlot['provider'] | 'zen', s: Partial<AppSettings> = readSettings()): boolean =>
  Boolean(provider === 'openrouter' ? getOpenRouterKey(s) : provider === 'zen' ? getZenKey(s) : getGeminiKey(s));

/** Upgrades devices that only ever had a single `model` string. */
export const migrateModelSettings = (s: AppSettings): AppSettings => {
  if (s.modelTiers && s.activeTier) return s;
  const tiers: Record<ModelTier, ModelSlot> = { ...DEFAULT_TIERS, ...(s.modelTiers || {}) };
  const legacyTier = LEGACY_TIER[s.model];
  if (legacyTier && !s.modelTiers) tiers[legacyTier] = { provider: 'gemini', model: s.model };
  return { ...s, modelTiers: tiers, activeTier: s.activeTier || legacyTier || DEFAULT_TIER };
};

/** Tier id (or a legacy gemini id) → the slot that will actually serve the request. */
export const resolveSlot = (tier: string | undefined, s: Partial<AppSettings> = readSettings()): ModelSlot => {
  const slot = (tier && s.modelTiers?.[tier as ModelTier]) || DEFAULT_TIERS[tier as ModelTier] || DEFAULT_TIERS[DEFAULT_TIER];
  if (slot?.model) return slot;
  // Last resort for a device still holding a raw model id.
  return { provider: 'gemini', model: tier || DEFAULT_TIERS[DEFAULT_TIER].model };
};

export const tierName = (tier: string | undefined): string =>
  TIERS.find(t => t.id === tier)?.name || TIERS.find(t => t.id === DEFAULT_TIER)!.name;
