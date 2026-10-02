// Jev 1.13 (TypeSafe "System One") via OpenCode Zen — https://opencode.ai/zen/v1/systemone
//
// Jev does not generate text. It evaluates a `state` against typed questions and returns
// probabilities. That makes it the right tool for every "classify / score / yes-no" moment in
// the app (mood, priority, intent), where a chat LLM is 10–50× slower and heavier.
//
// Design for low-end devices:
//   • one tiny JSON POST, no streaming, no SDK
//   • results memoised in localStorage by (question-set, text) hash → zero repeat calls
//   • in-flight de-duplication, AbortController, 6 s timeout
//   • every helper returns null on any failure so callers fall back silently

import { Priority } from '../types';

const ENDPOINT = 'https://opencode.ai/zen/v1/systemone';
const MODEL = 'jev-1.13-free';
const CACHE_KEY = 'mf_jev_cache';
const CACHE_MAX = 200;
const TIMEOUT_MS = 6000;

type NoulQ = { type: 'noul'; instructions: string };
type ChoiceQ = { type: 'choice'; instructions: string; criteria: Record<string, string> };
type ScoreQ = { type: 'score'; instructions: string; criteria: string[] };
export type JevQuestion = NoulQ | ChoiceQ | ScoreQ;

export type JevAnswer =
  | { type: 'noul'; noul: number }
  | { type: 'choice'; choice: string; probabilities: Record<string, number>; confidence: number }
  | { type: 'score'; score: number; probabilities: Record<string, number>; confidence: number };

export const noul = (instructions: string): NoulQ => ({ type: 'noul', instructions });
export const choice = (instructions: string, criteria: Record<string, string>): ChoiceQ => ({ type: 'choice', instructions, criteria });
export const score = (instructions: string, criteria: string[]): ScoreQ => ({ type: 'score', instructions, criteria });

export const getJevApiKey = (): string => {
  try {
    const parsed = JSON.parse(localStorage.getItem('mf_settings') || '{}');
    if (typeof parsed.opencodeApiKey === 'string' && parsed.opencodeApiKey.trim()) return parsed.opencodeApiKey.trim();
  } catch {}
  return (import.meta as any).env?.VITE_OPENCODE_API_KEY || '';
};

export const isJevAvailable = () => Boolean(getJevApiKey()) && navigator.onLine !== false;

// --- tiny FNV-1a hash; good enough for a cache key, no crypto needed -----------------------
const hash = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
};

type CacheShape = Record<string, { t: number; a: Record<string, JevAnswer> }>;
let memCache: CacheShape | null = null;
const readCache = (): CacheShape => {
  if (memCache) return memCache;
  try { memCache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { memCache = {}; }
  return memCache!;
};
const writeCache = (key: string, a: Record<string, JevAnswer>) => {
  const c = readCache();
  c[key] = { t: Date.now(), a };
  const keys = Object.keys(c);
  if (keys.length > CACHE_MAX) {
    keys.sort((x, y) => c[x].t - c[y].t).slice(0, keys.length - CACHE_MAX).forEach(k => delete c[k]);
  }
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {}
};

const inflight = new Map<string, Promise<Record<string, JevAnswer> | null>>();

export const askJev = async (
  state: string | Record<string, unknown>,
  questions: Record<string, JevQuestion>,
  signal?: AbortSignal
): Promise<Record<string, JevAnswer> | null> => {
  const apiKey = getJevApiKey();
  if (!apiKey) return null;

  const key = hash(JSON.stringify([questions, state]));
  const cached = readCache()[key];
  if (cached) return cached.a;
  if (inflight.has(key)) return inflight.get(key)!;

  const run = (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    signal?.addEventListener('abort', () => ctrl.abort(), { once: true });
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, state, questions }),
        signal: ctrl.signal,
      });
      if (!res.ok) return null;
      const json = await res.json();
      const answers = json?.answers as Record<string, JevAnswer> | undefined;
      if (!answers) return null;
      writeCache(key, answers);
      return answers;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
      inflight.delete(key);
    }
  })();
  inflight.set(key, run);
  return run;
};

// ---------------------------------------------------------------------------------------------
// App-level decisions
// ---------------------------------------------------------------------------------------------

const cleanText = (t: string) => t.replace(/[#*`_~[\]()>|-]/g, ' ').replace(/\s+/g, ' ').trim();

// Mood is a *classification* — ideal for Jev. Criteria descriptions are what Jev matches on.
export const MOOD_CRITERIA: Record<string, string> = {
  Happy: 'Cheerful, pleased, things went well',
  Calm: 'Peaceful, settled, unhurried',
  Energetic: 'High energy, lively, active',
  Grateful: 'Thankful, appreciative of people or moments',
  Inspired: 'Full of ideas, moved by something',
  Focused: 'Concentrated, productive, on task',
  Proud: 'Accomplished something, self-satisfied',
  Cozy: 'Comfortable, snug, homely small pleasures',
  Reflective: 'Thinking things over, introspective, neutral tone',
  Nostalgic: 'Remembering the past fondly or wistfully',
  Tired: 'Low energy, drained, sleepy',
  Anxious: 'Worried, uneasy about what may happen',
  Stressed: 'Overloaded, under pressure, too much to do',
  Sad: 'Down, hurt, grieving, disappointed',
  Tense: 'Irritated, frustrated, angry, conflict',
  Loved: 'Feeling cared for, connected, affectionate',
  Creative: 'Making things, artistic flow',
  Dreamy: 'Imaginative, wistful, head in the clouds',
};

export const detectMoodWithJev = async (
  text: string,
  signal?: AbortSignal
): Promise<{ label: string; confidence: number; intensity: number } | null> => {
  const clean = cleanText(text);
  if (clean.length < 20) return null;
  const answers = await askJev(
    clean.slice(0, 1200),
    {
      mood: choice('What is the dominant emotional tone of this journal entry?', MOOD_CRITERIA),
      intensity: score('How emotionally intense is the writing?', ['Flat or matter-of-fact', 'Noticeable feeling', 'Strong, vivid emotion']),
    },
    signal
  );
  const m = answers?.mood, i = answers?.intensity;
  if (!m || m.type !== 'choice') return null;
  return { label: m.choice, confidence: m.confidence, intensity: i && i.type === 'score' ? i.score : 1 };
};

// Task priority + "is this really several tasks?" in one round-trip.
export const assessTaskWithJev = async (
  text: string,
  signal?: AbortSignal
): Promise<{ priority: Priority; priorityConfidence: number; isCompound: number } | null> => {
  const clean = cleanText(text);
  if (clean.length < 4) return null;
  const answers = await askJev(
    clean.slice(0, 400),
    {
      urgency: score('How urgent and important is this to-do item?', [
        'Someday / nice to have, no deadline implied',
        'Normal task to do soon',
        'Urgent, deadline, blocking, or high stakes',
      ]),
      compound: noul('Does this item bundle several distinct steps that would benefit from being broken into subtasks?'),
    },
    signal
  );
  const u = answers?.urgency, c = answers?.compound;
  if (!u || u.type !== 'score') return null;
  const priority: Priority = u.score >= 1.5 ? 'high' : u.score >= 0.6 ? 'medium' : 'low';
  return { priority, priorityConfidence: u.confidence, isCompound: c && c.type === 'noul' ? c.noul : 0 };
};

// Quick-entry intent: did the user type a task, or a reflection that belongs in the journal?
export const classifyQuickEntry = async (text: string, signal?: AbortSignal): Promise<'task' | 'reflection' | null> => {
  const clean = cleanText(text);
  if (clean.split(' ').length < 6) return null; // short lines are tasks; don't spend a call
  const answers = await askJev(clean.slice(0, 400), {
    kind: choice('Is this line an actionable to-do or a personal reflection/feeling?', {
      task: 'An action to perform: verbs like buy, call, finish, send, fix',
      reflection: 'A feeling, memory, observation or diary-style thought with no action',
    }),
  }, signal);
  const k = answers?.kind;
  if (!k || k.type !== 'choice' || k.confidence < 0.6) return null;
  return k.choice as 'task' | 'reflection';
};
