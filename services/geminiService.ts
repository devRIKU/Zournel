import { GoogleGenAI, Type } from "@google/genai";
import { AIProcessedInput, Priority } from "../types";

const imageModelName = 'gemini-3-pro-image-preview';
const STORAGE_KEY = 'zournel_api_key';

const getApiKey = (): string => {
  return localStorage.getItem(STORAGE_KEY) || process.env.API_KEY || '';
};

const handleAiError = (error: any) => {
  console.error("AI Error:", error);
};

// Utility to clean model output that might include markdown code blocks
const cleanJsonString = (str: string) => {
  return str.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const processUserInput = async (input: string, model: string = 'gemini-3-flash-preview'): Promise<AIProcessedInput> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });
  
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

  try {
    const response = await ai.models.generateContent({
      model: model,
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

export const extractTasksFromJournal = async (journalText: string, model: string = 'gemini-3-flash-preview'): Promise<{ text: string, priority: Priority }[]> => {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const ai = new GoogleGenAI({ apiKey });
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

  try {
    const response = await ai.models.generateContent({
      model: model,
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

export const generateSubtasks = async (taskText: string, model: string = 'gemini-3-flash-preview'): Promise<string[]> => {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const ai = new GoogleGenAI({ apiKey });
  const responseSchema = {
    type: Type.ARRAY,
    items: { type: Type.STRING },
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
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

export const generateJournalInsight = async (entryText: string, model: string = 'gemini-3-flash-preview'): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "";

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: model,
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

export const editJournalText = async (text: string, type: 'IMPROVE' | 'REPHRASE' | 'SUMMARIZE', model: string = 'gemini-3-flash-preview'): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return text;

  const ai = new GoogleGenAI({ apiKey });
  const prompts = { 
    IMPROVE: "Enhance the flow, vocabulary, and clarity of this text while maintaining its original meaning and personal tone:", 
    REPHRASE: "Rewrite this entry in a more elegant and literary style, keeping the first-person perspective and emotional honesty:", 
    SUMMARIZE: "Condense this journal entry into a brief, powerful summary that highlights the core events and feelings mentioned:" 
  };
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
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: imageModelName,
      contents: {
        parts: [{ text: `A minimalist, soothing, and atmospheric abstract digital art piece that visually represents the mood and themes of this journal entry: ${context}. Focus on soft colors and simple compositions.` }]
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