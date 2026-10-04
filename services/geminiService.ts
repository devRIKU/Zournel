
import type { GoogleGenAI } from "@google/genai";
// The GenAI SDK (~290 KB) is loaded on first AI call, never at boot.
const loadGenAI = () => import("@google/genai");
import { AIProcessedInput, Priority } from "../types";
import { isJevAvailable, detectMoodWithJev } from "./jevService";
import { openRouterChat } from "./openrouter";
import {
  DEFAULT_TIERS, ModelOption, getGeminiKey, getOpenRouterKey, presetsFor,
  readModelCache, readSettings, resolveSlot, writeModelCache,
} from "./modelConfig";

// Modern standard model names
const imageModelName = 'gemini-3.1-flash-lite-image';

export type AiActionType = 'PROOFREAD' | 'REWRITE' | 'IMPROVE' | 'REPHRASE' | 'SUMMARIZE' | 'EXPAND';

const handleAiError = (error: any) => {
  console.warn("AI Warning/Error:", error.message || error);
};

// Utility to clean model output that might include markdown code blocks
const cleanJsonString = (str: string) => {
  return str.replace(/```json/g, '').replace(/```/g, '').trim();
};

interface GenerateOptions {
  system?: string;
  json?: boolean;
  temperature?: number;
  /** Gemini structured output; OpenRouter is asked for JSON in the prompt instead. */
  schema?: any;
}

/**
 * Every text call in this file funnels through here. `tier` is an Ember / Lantern / Beacon id;
 * the slot decides whether that means OpenRouter or Gemini today.
 */
const generate = async (prompt: string, tier: string, opts: GenerateOptions = {}): Promise<string | null> => {
  const settings = readSettings();
  const slot = resolveSlot(tier, settings);
  const wantsJson = Boolean(opts.json || opts.schema);

  if (slot.provider === 'openrouter' && getOpenRouterKey(settings)) {
    const text = await openRouterChat({
      model: slot.model,
      prompt,
      system: opts.system,
      json: wantsJson,
      temperature: opts.temperature,
    });
    if (text !== null) return text;
    // OpenRouter is down or the key was rejected — fall back to Gemini rather than
    // failing the feature, using a Gemini model name rather than the OpenRouter id.
  }

  const apiKey = getGeminiKey(settings);
  if (!apiKey) {
    console.warn("AI Warning: no Gemini or OpenRouter API key configured.");
    return null;
  }
  const ai = await getAiClient(apiKey);
  if (!ai) return null;

  const config: any = {};
  if (opts.schema) {
    config.responseMimeType = "application/json";
    config.responseSchema = opts.schema;
  } else if (opts.json) {
    config.responseMimeType = "application/json";
  }

  const response = await generateContentWithFallback(
    ai,
    slot.provider === 'openrouter' ? DEFAULT_TIERS.lantern.model : slot.model,
    {
      contents: prompt,
      ...(Object.keys(config).length ? { config } : {}),
    }
  );
  return response?.text ?? null;
};

const getAiClient = async (apiKeyOverride?: string): Promise<GoogleGenAI | null> => {
  const apiKey = (apiKeyOverride || '').trim() || getGeminiKey();

  if (!apiKey) {
    return null;
  }
  const { GoogleGenAI } = await loadGenAI();
  return new GoogleGenAI({ apiKey });
};

const generateContentWithFallback = async (ai: GoogleGenAI, primaryModel: string, params: any) => {
  const modelsToTry = [primaryModel, 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemma-4-31b-it', 'gemini-3.5-flash-lite'];
  const uniqueModels = Array.from(new Set(modelsToTry.filter(Boolean)));
  let lastError: any = null;

  for (const modelName of uniqueModels) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model: modelName,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      console.warn(`Gemini generation failed for model ${modelName}, trying fallback model...`, err?.message || err);
    }
  }
  throw lastError;
};

export const processUserInput = async (input: string, tier: string = 'ember'): Promise<AIProcessedInput> => {
  try {
    const responseSchema = {
      type: "OBJECT",
      properties: {
        tasks: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: 'A list of actionable, concise tasks extracted from the input.'
        },
        journalContent: {
          type: "STRING",
          description: 'The narrative, reflective, or emotional part of the input, cleaned of task-like syntax.'
        },
        mood: {
          type: "STRING",
          description: 'A short, evocative phrase or word describing the emotional tone of the entry.'
        }
      },
      required: ['tasks', 'journalContent', 'mood']
    };

    const response = await generate(`You are an intelligent assistant for a personal journal and task manager. I will provide you with a stream of consciousness input that might contain both things to do and personal reflections. 
      Please carefully separate them. 
      - Extract any actionable items into the 'tasks' array.
      - Put the reflective, narrative, or emotional content into 'journalContent'.
      - Identify the overall 'mood'.
      
      Input: "${input}"`, tier, { schema: responseSchema });

    if (!response) return { tasks: [], journalContent: null, mood: null };
    const text = response;
    return JSON.parse(cleanJsonString(text));
  } catch (error) {
    handleAiError(error);
    return { tasks: [], journalContent: null, mood: null };
  }
};

export const extractTasksFromJournal = async (journalText: string, tier: string = 'ember'): Promise<{ text: string, priority: Priority }[]> => {
  try {
    const responseSchema = {
      type: "OBJECT",
      properties: {
        tasks: {
          type: "ARRAY",
          items: { 
            type: "OBJECT",
            properties: {
              text: { type: "STRING", description: 'The task description.' },
              priority: { type: "STRING", description: 'Assigned priority: high, medium, or low.' }
            },
            required: ['text', 'priority']
          }
        }
      }
    };

    const response = await generate(`Act as a personal organizer. Read the following journal entry and identify any implicit or explicit tasks, errands, or future commitments mentioned by the user. 
      Assign a priority ('high', 'medium', or 'low') to each task based on the urgency or importance suggested by the context. 
      Return an empty list if no tasks are found.
      
      Entry: "${journalText}"`, tier, { schema: responseSchema });

    if (!response) return [];
    const result = JSON.parse(cleanJsonString(response));
    return result.tasks || [];
  } catch (error) {
    handleAiError(error);
    return [];
  }
};

export const generateSubtasks = async (taskText: string, tier: string = 'ember'): Promise<string[]> => {
  try {
    const responseSchema = {
      type: "ARRAY",
      items: { type: "STRING" },
    };

    const response = await generate(`Break down the following task into 3 to 5 logical, small, and actionable steps to help the user get started and maintain momentum: "${taskText}"`, tier, { schema: responseSchema });

    if (!response) return [];
    return JSON.parse(cleanJsonString(response));
  } catch (error) {
    handleAiError(error);
    return [];
  }
};

export const generateJournalInsight = async (entryText: string, tier: string = 'lantern'): Promise<string> => {
  try {
    const response = await generate(`You are a wise and empathetic companion. Read this journal entry: "${entryText}". 
      Provide exactly one single, deeply reflective, and encouraging sentence that captures the emotional essence, a key insight, or a positive growth moment from the user's thoughts. 
      Keep it poetic but grounded. Do not use generic self-help clichés.`, tier, {});
    return response?.trim() || "";
  } catch (error) {
    handleAiError(error);
    return "";
  }
};

export const editJournalText = async (text: string, type: AiActionType, tier: string = 'lantern'): Promise<string> => {
  try {
    const prompts: Record<AiActionType, string> = { 
      PROOFREAD: "You are a meticulous copy editor. Proofread the following journal entry. Correct any spelling, punctuation, and grammar mistakes without altering the author's voice, phrasing, or core message. Return ONLY the proofread text. NO headers, NO conversational filler, NO quotes around the text.",
      REWRITE: "You are an expert writing consultant. Rewrite the following journal entry to improve sentence structure, rhythm, and clarity while keeping the original meaning and emotion intact. Return ONLY the rewritten text. NO headers, NO conversational filler, NO quotes around the text.",
      IMPROVE: "You are a professional editor. Improve the following journal entry for better clarity, grammar, and vocabulary while keeping the personal tone. Return ONLY the improved text. NO headers, NO conversational filler, NO quotes around the text.", 
      REPHRASE: "You are a literary writer. Rewrite the following journal entry in an elegant, poetic, and literary style. Maintain the original emotional honesty and first-person perspective. Return ONLY the rephrased text. NO headers, NO conversational filler, NO quotes around the text.", 
      SUMMARIZE: "Summarize this journal entry into a single powerful paragraph that captures the heart of the experience. Return ONLY the summary. NO headers, NO conversational filler, NO quotes around the text.",
      EXPAND: "You are a thoughtful writing partner. Expand the following journal entry by deepening the reflections, adding sensory details, and encouraging further self-inquiry while staying true to the author's original experience. Return ONLY the expanded text. NO headers, NO conversational filler, NO quotes around the text."
    };
    
    const response = await generate(`${prompts[type]}\n\nInput Text:\n"${text}"`, tier, {});
    return response?.trim() || text;
  } catch (error) {
    handleAiError(error);
    return text;
  }
};

// --- model catalogue -------------------------------------------------------------------------
// Plain REST rather than the SDK: this list is needed before any generation happens and it
// shouldn't pull the 290 KB client in on its own.

const CATALOG_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

let catalogRequest: Promise<ModelOption[]> | null = null;

export const fetchGeminiModels = async (force = false): Promise<ModelOption[]> => {
  if (!force) {
    const cached = readModelCache('gemini');
    if (cached) return cached;
  }
  if (catalogRequest) return catalogRequest;

  catalogRequest = (async () => {
    const apiKey = getGeminiKey();
    if (!apiKey) return presetsFor('gemini');
    try {
      const res = await fetch(`${CATALOG_ENDPOINT}?key=${encodeURIComponent(apiKey)}&pageSize=1000`);
      if (!res.ok) throw new Error(`Gemini models ${res.status}`);
      const data = await res.json();
      const strip = (name: string) => String(name || '').replace(/^models\//, '');
      const models: ModelOption[] = (data?.models || [])
        // only models that can actually answer a prompt
        .filter((m: any) => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map((m: any) => {
          const id = strip(m.name);
          return { id, label: m.displayName || id };
        })
        .filter((m: ModelOption) => Boolean(m.id))
        .sort((a, b) => {
          const experimental = (id: string) => (/exp|preview|latest/i.test(id) ? 1 : 0);
          return experimental(a.id) - experimental(b.id) || a.id.localeCompare(b.id);
        });
      if (!models.length) throw new Error('Gemini returned no text models');
      writeModelCache('gemini', models);
      return models;
    } catch (err: any) {
      console.warn('Could not load Gemini models:', err?.message || err);
      return presetsFor('gemini');
    } finally {
      catalogRequest = null;
    }
  })();

  return catalogRequest;
};

// JSON answers, on whichever provider the tier is mapped to.
export const generateJson = async (prompt: string, tier: string, schema?: any): Promise<string | null> =>
  generate(prompt, tier, schema ? { schema } : { json: true });

// Gemini only: this needs the image model's inline-data response, which OpenRouter doesn't serve.
export const generateCoverImage = async (context: string): Promise<string | null> => {
  try {
    const ai = await getAiClient();
    if (!ai) {
      console.warn("AI Warning: Gemini API Key is missing. Please configure it in Preferences.");
      return null;
    }
    const response = await ai.models.generateContent({
      model: imageModelName,
      contents: {
        parts: [{ text: `A minimalist, soothing, and atmospheric abstract digital art piece that visually represents the mood and themes of this journal entry: ${context}. Focus on soft colors and simple compositions.` }]
      },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    if (!response.candidates?.[0]?.content?.parts) return null;

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    handleAiError(error);
    return null;
  }
};

export const PRESET_MOODS_LIST = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '⚡', label: 'Energetic' },
  { emoji: '🙏', label: 'Grateful' },
  { emoji: '💡', label: 'Inspired' },
  { emoji: '🎯', label: 'Focused' },
  { emoji: '🏆', label: 'Proud' },
  { emoji: '☕', label: 'Cozy' },
  { emoji: '💭', label: 'Reflective' },
  { emoji: '🌊', label: 'Nostalgic' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '😰', label: 'Anxious' },
  { emoji: '🤯', label: 'Stressed' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😠', label: 'Tense' },
  { emoji: '🌟', label: 'Radiant' },
  { emoji: '🌱', label: 'Growth' },
  { emoji: '🍵', label: 'Serene' },
  { emoji: '💖', label: 'Loved' },
  { emoji: '🥰', label: 'Warm' },
  { emoji: '🧘', label: 'Mindful' },
  { emoji: '🚀', label: 'Driven' },
  { emoji: '🎨', label: 'Creative' },
  { emoji: '🌿', label: 'Grounded' },
  { emoji: '🌙', label: 'Dreamy' },
  { emoji: '🛋️', label: 'Relaxed' }
];

export const moodFromLabel = (label: string) => {
  const found = PRESET_MOODS_LIST.find(m => m.label.toLowerCase() === label.toLowerCase()) || PRESET_MOODS_LIST[8]; // Reflective
  return { emoji: found.emoji, label: found.label, fullMood: `${found.emoji} ${found.label}` };
};

export const detectMoodFromJournal = async (journalText: string, tier: string = 'ember'): Promise<{ emoji: string; label: string; fullMood: string } | null> => {
  // The configured decision model answers a classification in one tiny request and is cached per text —
  // no LLM, no tokens, no streaming. Gemini below is only the fallback.
  if (isJevAvailable()) {
    const jev = await detectMoodWithJev(journalText);
    if (jev && jev.confidence >= 0.35) return moodFromLabel(jev.label);
  }
  try {
    const cleanText = journalText.replace(/[#*`_~[\]()]/g, '').trim();
    if (!cleanText || cleanText.length < 5) return null;

    const allowedLabels = PRESET_MOODS_LIST.map(m => m.label);

    const responseSchema = {
      type: "OBJECT",
      properties: {
        label: { 
          type: "STRING", 
          description: `You MUST select EXACTLY one mood label from this allowed list: ${allowedLabels.join(', ')}` 
        }
      },
      required: ['label']
    };

    let text: string | null = null;
    try {
      text = await generate(
        `Analyze the emotional tone of this journal entry and choose the single best matching mood label from this exact allowed list: ${allowedLabels.join(', ')}. Return ONLY the label.\nJournal entry:\n"${cleanText.slice(0, 1000)}"`,
        tier,
        { schema: responseSchema }
      );
    } catch (err) {
      console.warn("Structured mood detection failed, trying fallback...", err);
    }
    if (!text) {
      text = await generate(
        `Analyze the emotional tone of this journal entry and return EXACTLY one mood label from this list: ${allowedLabels.join(', ')}.\nJournal entry:\n"${cleanText.slice(0, 1000)}"`,
        tier,
        { json: true }
      );
    }
    if (!text) return null;

    let matchedLabel = 'Reflective';
    let matchedEmoji = '💭';

    try {
      const parsed = JSON.parse(cleanJsonString(text));
      if (parsed.label) {
        matchedLabel = parsed.label.trim();
      }
    } catch (e) {
      matchedLabel = text.replace(/[^a-zA-Z]/g, '').trim() || 'Reflective';
    }

    // Find matching preset
    const found = PRESET_MOODS_LIST.find(m => m.label.toLowerCase() === matchedLabel.toLowerCase()) || PRESET_MOODS_LIST[8]; // default Reflective
    return {
      emoji: found.emoji,
      label: found.label,
      fullMood: `${found.emoji} ${found.label}`
    };
  } catch (error) {
    handleAiError(error);
    return null;
  }
};

export const extractAutoTitle = (journalText: string): string => {
  if (!journalText || !journalText.trim()) return 'Untitled Memory';
  
  // 1. Check if there's a markdown heading like "# My Heading" or "## Title"
  const headingMatch = journalText.match(/^#+\s+(.+)$/m);
  if (headingMatch && headingMatch[1].trim()) {
    const title = headingMatch[1].replace(/[*_~`]/g, '').trim();
    if (title.length > 0) return title.slice(0, 60);
  }

  // 2. Strip markdown elements and clean up line breaks
  const clean = journalText
    .replace(/^#+\s+/gm, '') 
    .replace(/!\[.*?\]\(.*?\)/g, '') 
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') 
    .replace(/[*_~`>]/g, '') 
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return 'Untitled Memory';

  // Take the first sentence if available and reasonable length
  const firstSentence = clean.split(/[.!?]\s+/)[0].trim();
  if (firstSentence && firstSentence.length >= 3 && firstSentence.length <= 50) {
    return firstSentence;
  }

  // Otherwise take first 6 words
  const words = clean.split(/\s+/).slice(0, 6);
  if (words.length > 0) {
    const titleCandidate = words.join(' ');
    if (clean.length > titleCandidate.length) {
      return titleCandidate + '...';
    }
    return titleCandidate;
  }

  return 'Untitled Memory';
};

export const generateAutoTitle = async (
  journalText: string,
  tier: string = 'lantern'
): Promise<string> => {
  try {
    const fallbackTitle = extractAutoTitle(journalText);

    const cleanText = journalText.replace(/[#*`_~[\]()]/g, '').trim();
    if (!cleanText || cleanText.length < 10) {
      return fallbackTitle;
    }

    const response = await generate(
      `You are an expert editor for a personal journal. Craft a short, meaningful, poetic, or reflective title (between 2 and 6 words) that captures the core essence or main theme of this entry.
Rules:
- DO NOT use generic titles like "Journal Entry", "Daily Thoughts", or "My Reflection".
- Return ONLY the title text. No quotes, no markdown, no leading labels.

Journal Entry:
"${cleanText.slice(0, 1500)}"`,
      tier
    );

    const rawText = response?.trim() || '';
    const titleText = rawText
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
      .replace(/^title:\s*/i, '')
      .replace(/[*_~`#]/g, '')
      .trim();

    if (titleText && titleText.length >= 2 && titleText.length <= 70) {
      return titleText;
    }
    return fallbackTitle;
  } catch (error) {
    handleAiError(error);
    return extractAutoTitle(journalText);
  }
};

