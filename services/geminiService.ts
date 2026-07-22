
import { GoogleGenAI, Type } from "@google/genai";
import { AIProcessedInput, Priority } from "../types";

// nano banana model name for image generation
const imageModelName = 'gemini-2.5-flash-image';

export type AiActionType = 'PROOFREAD' | 'REWRITE' | 'IMPROVE' | 'REPHRASE' | 'SUMMARIZE' | 'EXPAND';

const routeModel = (model: string, type: 'TODO' | 'POLISH'): string => {
  // Gracefully route models based on specialization requested:
  // - Gemini 3.5 flash for polishing / summarizing and general insights
  // - Gemini 3.5 flash lite for Todo AI & extraction tasks
  if (model === 'gemini-3-flash-preview' || model === 'gemini-3.5-flash' || model === 'gemini-3.1-flash-lite' || model === 'gemini-3.5-flash-lite' || model === 'gemini-flash-lite') {
    return type === 'POLISH' ? 'gemini-3.5-flash' : 'gemini-3.5-flash-lite';
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

const getAiClient = () => {
  const settingsStr = localStorage.getItem('mf_settings');
  const apiKey = settingsStr ? JSON.parse(settingsStr).apiKey : '';
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
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

export const generateJournalInsight = async (entryText: string, model: string = 'gemini-3.5-flash'): Promise<string> => {
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

export const editJournalText = async (text: string, type: AiActionType, model: string = 'gemini-3.5-flash'): Promise<string> => {
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
