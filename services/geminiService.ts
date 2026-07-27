
import { GoogleGenAI, Type } from "@google/genai";
import { AIProcessedInput, Priority } from "../types";

// Modern standard model names
const imageModelName = 'gemini-3.1-flash-lite-image';

export type AiActionType = 'PROOFREAD' | 'REWRITE' | 'IMPROVE' | 'REPHRASE' | 'SUMMARIZE' | 'EXPAND';

const routeModel = (model: string, type: 'TODO' | 'POLISH'): string => {
  // Gracefully route models based on specialization requested:
  // - Gemini 3.5 flash-lite (default) for fast tasks, extraction, and general processing
  // - Gemini 3.6 flash for polishing / summarizing and general insights
  // - Gemma 4 31b mapped to open weights model
  if (!model) {
    return type === 'POLISH' ? 'gemini-3.6-flash' : 'gemini-3.5-flash-lite';
  }
  if (model === 'gemma-4-31b-it') {
    return 'gemma-2-27b-it';
  }
  return model;
};

const handleAiError = (error: any) => {
  console.warn("AI Warning/Error:", error.message || error);
};

// Utility to clean model output that might include markdown code blocks
const cleanJsonString = (str: string) => {
  return str.replace(/```json/g, '').replace(/```/g, '').trim();
};

const getAiClient = (apiKeyOverride?: string) => {
  let apiKey = apiKeyOverride || '';

  if (!apiKey) {
    try {
      const settingsStr = localStorage.getItem('mf_settings');
      if (settingsStr) {
        const parsed = JSON.parse(settingsStr);
        if (parsed.apiKey && typeof parsed.apiKey === 'string' && parsed.apiKey.trim().length > 0) {
          apiKey = parsed.apiKey.trim();
        }
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  if (!apiKey) {
    apiKey = 
      (typeof process !== 'undefined' && process.env ? (process.env.GEMINI_API_KEY || process.env.API_KEY) : '') ||
      (typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY) : '') ||
      (typeof window !== 'undefined' && ((window as any).GEMINI_API_KEY || (window as any).API_KEY)) ||
      '';
  }

  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

const generateContentWithFallback = async (ai: GoogleGenAI, primaryModel: string, params: any) => {
  const modelsToTry = [primaryModel, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
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

export const processUserInput = async (input: string, model: string = 'gemini-3.5-flash-lite'): Promise<AIProcessedInput> => {
  try {
    const ai = getAiClient();
    if (!ai) {
      console.warn("AI Warning: Gemini API Key is missing. Please configure it in Preferences.");
      return { tasks: [], journalContent: null, mood: null };
    }
    const activeModel = routeModel(model, 'TODO');
    
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        tasks: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'A list of actionable, concise tasks extracted from the input.'
        },
        journalContent: {
          type: Type.STRING,
          description: 'The narrative, reflective, or emotional part of the input, cleaned of task-like syntax.'
        },
        mood: {
          type: Type.STRING,
          description: 'A short, evocative phrase or word describing the emotional tone of the entry.'
        }
      },
      required: ['tasks', 'journalContent', 'mood']
    };

    const response = await ai.models.generateContent({
      model: activeModel,
      contents: `You are an intelligent assistant for a personal journal and task manager. I will provide you with a stream of consciousness input that might contain both things to do and personal reflections. 
      Please carefully separate them. 
      - Extract any actionable items into the 'tasks' array.
      - Put the reflective, narrative, or emotional content into 'journalContent'.
      - Identify the overall 'mood'.
      
      Input: "${input}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    if (!text) return { tasks: [], journalContent: null, mood: null };
    return JSON.parse(cleanJsonString(text));
  } catch (error) {
    handleAiError(error);
    return { tasks: [], journalContent: null, mood: null };
  }
};

export const extractTasksFromJournal = async (journalText: string, model: string = 'gemini-3.5-flash-lite'): Promise<{ text: string, priority: Priority }[]> => {
  try {
    const ai = getAiClient();
    if (!ai) {
      console.warn("AI Warning: Gemini API Key is missing. Please configure it in Preferences.");
      return [];
    }
    const activeModel = routeModel(model, 'TODO');
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        tasks: {
          type: Type.ARRAY,
          items: { 
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: 'The task description.' },
              priority: { type: Type.STRING, description: 'Assigned priority: high, medium, or low.' }
            },
            required: ['text', 'priority']
          }
        }
      }
    };

    const response = await ai.models.generateContent({
      model: activeModel,
      contents: `Act as a personal organizer. Read the following journal entry and identify any implicit or explicit tasks, errands, or future commitments mentioned by the user. 
      Assign a priority ('high', 'medium', or 'low') to each task based on the urgency or importance suggested by the context. 
      Return an empty list if no tasks are found.
      
      Entry: "${journalText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      },
    });

    const text = response.text;
    if (!text) return [];
    const result = JSON.parse(cleanJsonString(text));
    return result.tasks || [];
  } catch (error) {
    handleAiError(error);
    return [];
  }
};

export const generateSubtasks = async (taskText: string, model: string = 'gemini-3.5-flash-lite'): Promise<string[]> => {
  try {
    const ai = getAiClient();
    if (!ai) {
      console.warn("AI Warning: Gemini API Key is missing. Please configure it in Preferences.");
      return [];
    }
    const activeModel = routeModel(model, 'TODO');
    const responseSchema = {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    };

    const response = await ai.models.generateContent({
      model: activeModel,
      contents: `Break down the following task into 3 to 5 logical, small, and actionable steps to help the user get started and maintain momentum: "${taskText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(cleanJsonString(text));
  } catch (error) {
    handleAiError(error);
    return [];
  }
};

export const generateJournalInsight = async (entryText: string, model: string = 'gemini-3.6-flash'): Promise<string> => {
  try {
    const ai = getAiClient();
    if (!ai) {
      console.warn("AI Warning: Gemini API Key is missing. Please configure it in Preferences.");
      return "";
    }
    const activeModel = routeModel(model, 'POLISH');
    const response = await ai.models.generateContent({
      model: activeModel,
      contents: `You are a wise and empathetic companion. Read this journal entry: "${entryText}". 
      Provide exactly one single, deeply reflective, and encouraging sentence that captures the emotional essence, a key insight, or a positive growth moment from the user's thoughts. 
      Keep it poetic but grounded. Do not use generic self-help clichés.`,
    });
    return response.text?.trim() || "";
  } catch (error) {
    handleAiError(error);
    return "";
  }
};

export const editJournalText = async (text: string, type: AiActionType, model: string = 'gemini-3.6-flash'): Promise<string> => {
  try {
    const ai = getAiClient();
    if (!ai) {
      console.warn("AI Warning: Gemini API Key is missing. Please configure it in Preferences.");
      return text;
    }
    const activeModel = routeModel(model, 'POLISH');
    const prompts: Record<AiActionType, string> = { 
      PROOFREAD: "You are a meticulous copy editor. Proofread the following journal entry. Correct any spelling, punctuation, and grammar mistakes without altering the author's voice, phrasing, or core message. Return ONLY the proofread text. NO headers, NO conversational filler, NO quotes around the text.",
      REWRITE: "You are an expert writing consultant. Rewrite the following journal entry to improve sentence structure, rhythm, and clarity while keeping the original meaning and emotion intact. Return ONLY the rewritten text. NO headers, NO conversational filler, NO quotes around the text.",
      IMPROVE: "You are a professional editor. Improve the following journal entry for better clarity, grammar, and vocabulary while keeping the personal tone. Return ONLY the improved text. NO headers, NO conversational filler, NO quotes around the text.", 
      REPHRASE: "You are a literary writer. Rewrite the following journal entry in an elegant, poetic, and literary style. Maintain the original emotional honesty and first-person perspective. Return ONLY the rephrased text. NO headers, NO conversational filler, NO quotes around the text.", 
      SUMMARIZE: "Summarize this journal entry into a single powerful paragraph that captures the heart of the experience. Return ONLY the summary. NO headers, NO conversational filler, NO quotes around the text.",
      EXPAND: "You are a thoughtful writing partner. Expand the following journal entry by deepening the reflections, adding sensory details, and encouraging further self-inquiry while staying true to the author's original experience. Return ONLY the expanded text. NO headers, NO conversational filler, NO quotes around the text."
    };
    
    const response = await ai.models.generateContent({
      model: activeModel,
      contents: `${prompts[type]}\n\nInput Text:\n"${text}"`,
    });
    return response.text?.trim() || text;
  } catch (error) {
    handleAiError(error);
    return text;
  }
};

export const generateCoverImage = async (context: string): Promise<string | null> => {
  try {
    const ai = getAiClient();
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

export const detectMoodFromJournal = async (journalText: string, model: string = 'gemini-3.5-flash-lite', apiKeyOverride?: string): Promise<{ emoji: string; label: string; fullMood: string } | null> => {
  try {
    const ai = getAiClient(apiKeyOverride);
    if (!ai) {
      console.warn("AI Warning: Gemini API Key is missing. Please configure it in Preferences or environment.");
      return null;
    }
    const activeModel = routeModel(model, 'TODO');
    
    const cleanText = journalText.replace(/[#*`_~[\]()]/g, '').trim();
    if (!cleanText || cleanText.length < 5) return null;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        emoji: { type: Type.STRING, description: 'A single expressive emoji representing the emotional tone' },
        label: { type: Type.STRING, description: 'A 1-2 word mood descriptor e.g. Happy, Peaceful, Inspired, Grateful, Anxious, Nostalgic' }
      },
      required: ['emoji', 'label']
    };

    let response: any = null;
    try {
      response = await generateContentWithFallback(ai, activeModel, {
        contents: `Analyze the emotional tone of this journal entry and choose the single best expressive emoji and a 1-2 word mood label.\nJournal entry:\n"${cleanText.slice(0, 1000)}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });
    } catch (err) {
      console.warn("Structured mood detection failed, trying plain text fallback...", err);
      response = await generateContentWithFallback(ai, activeModel, {
        contents: `Analyze the emotional tone of this journal entry and return ONLY a single emoji followed by a 1-2 word mood label, e.g. "😊 Happy" or "😌 Peaceful".\nJournal entry:\n"${cleanText.slice(0, 1000)}"`,
      });
    }

    const text = response?.text;
    if (!text) return null;

    try {
      const parsed = JSON.parse(cleanJsonString(text));
      if (parsed.emoji && parsed.label) {
        return {
          emoji: parsed.emoji,
          label: parsed.label,
          fullMood: `${parsed.emoji} ${parsed.label}`
        };
      }
    } catch (e) {
      // Direct text parsing fallback if response wasn't JSON
      const emojiMatch = text.match(/(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u);
      const emoji = emojiMatch ? emojiMatch[0] : '✨';
      const label = text.replace(/(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u, '').replace(/[^a-zA-Z0-9\s-]/g, '').trim() || 'Reflective';
      return {
        emoji,
        label,
        fullMood: `${emoji} ${label}`
      };
    }
    return null;
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
  model: string = 'gemini-3.5-flash-lite', 
  apiKeyOverride?: string
): Promise<string> => {
  try {
    const fallbackTitle = extractAutoTitle(journalText);
    const ai = getAiClient(apiKeyOverride);
    if (!ai) {
      return fallbackTitle;
    }

    const cleanText = journalText.replace(/[#*`_~[\]()]/g, '').trim();
    if (!cleanText || cleanText.length < 10) {
      return fallbackTitle;
    }

    const activeModel = routeModel(model, 'TODO');

    const response = await ai.models.generateContent({
      model: activeModel,
      contents: `You are an expert editor for a personal journal blog. Generate a short, catchy, poetic, or reflective title (between 3 and 6 words) that captures the core essence or main theme of this entry.
Rules:
- DO NOT use generic titles like "Journal Entry", "Daily Thoughts", or "My Reflection".
- Return ONLY the title text. No quotes, no markdown, no leading labels.

Journal Entry:
"${cleanText.slice(0, 1500)}"`,
    });

    const titleText = response.text?.trim().replace(/^["']|["']$/g, '').replace(/[*_~`#]/g, '') || '';
    if (titleText && titleText.length >= 2 && titleText.length <= 70) {
      return titleText;
    }
    return fallbackTitle;
  } catch (error) {
    handleAiError(error);
    return extractAutoTitle(journalText);
  }
};

