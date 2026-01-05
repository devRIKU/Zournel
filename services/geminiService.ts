import { GoogleGenAI, Type } from "@google/genai";
import { AIProcessedInput, Priority } from "../types";

const imageModelName = 'gemini-3-pro-image-preview';

/**
 * Retrieves the API key, checking environment variables first, then stored cookies.
 */
const getApiKey = () => {
  if (process.env.API_KEY && process.env.API_KEY !== 'undefined') {
    return process.env.API_KEY;
  }
  const cookieMatch = document.cookie.match(/GEMINI_API_KEY=([^;]+)/);
  return cookieMatch ? cookieMatch[1] : undefined;
};

const handleAiError = (error: any) => {
  console.error("AI Error:", error);
};

const isThinkingSupported = (model: string): boolean => {
  return model.includes('gemini-3') || model.includes('gemini-2.5');
};

export const processUserInput = async (input: string, model: string = 'gemini-3-flash-preview'): Promise<AIProcessedInput> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      tasks: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Actionable tasks.'
      },
      journalContent: {
        type: Type.STRING,
        description: 'Narrative content.'
      },
      mood: {
        type: Type.STRING,
        description: 'Mood phrase.'
      }
    },
    required: ['tasks', 'journalContent', 'mood']
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `Separate this input: "${input}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    return text ? JSON.parse(text) : { tasks: [], journalContent: null, mood: null };
  } catch (error) {
    handleAiError(error);
    return { tasks: [], journalContent: null, mood: null };
  }
};

export const extractTasksFromJournal = async (journalText: string, model: string = 'gemini-3-flash-preview'): Promise<{ text: string, priority: Priority }[]> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      tasks: {
        type: Type.ARRAY,
        items: { 
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            priority: { type: Type.STRING }
          },
          required: ['text', 'priority']
        }
      }
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `Extract tasks from entry: "${journalText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      },
    });

    const text = response.text;
    const result = text ? JSON.parse(text) : { tasks: [] };
    return result.tasks || [];
  } catch (error) {
    handleAiError(error);
    return [];
  }
};

export const generateSubtasks = async (taskText: string, model: string = 'gemini-3-flash-preview'): Promise<string[]> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  const responseSchema = {
    type: Type.ARRAY,
    items: { type: Type.STRING },
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `Steps for task: "${taskText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    return text ? JSON.parse(text) : [];
  } catch (error) {
    handleAiError(error);
    return [];
  }
};

export const generateJournalInsight = async (entryText: string, model: string = 'gemini-3-flash-preview'): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `One reflective sentence: "${entryText}"`,
    });
    return response.text || "";
  } catch (error) {
    handleAiError(error);
    return "";
  }
};

export const editJournalText = async (text: string, type: 'IMPROVE' | 'REPHRASE' | 'SUMMARIZE', model: string = 'gemini-3-flash-preview'): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  const prompts = { IMPROVE: "Improve:", REPHRASE: "Rewrite:", SUMMARIZE: "Sum:" };
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `${prompts[type]} "${text}"`,
    });
    return response.text || text;
  } catch (error) {
    handleAiError(error);
    return text;
  }
};

export const generateCoverImage = async (context: string): Promise<string | null> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  try {
    const response = await ai.models.generateContent({
      model: imageModelName,
      contents: {
        parts: [{ text: `Minimalist soothing cover: ${context}.` }]
      },
      config: {
        imageConfig: { aspectRatio: "16:9", imageSize: "1K" }
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