
import { GoogleGenAI, Type } from "@google/genai";
import { AIProcessedInput, Priority } from "../types";

const imageModelName = 'gemini-3-pro-image-preview';

/**
 * Common error handler for API key issues
 */
const handleAiError = (error: any) => {
  console.error("AI Error:", error);
  if (error?.message?.includes("Requested entity was not found")) {
    // This indicates an issue with the selected API key/project
    console.warn("API Key issue detected. User may need to re-select key.");
  }
};

/**
 * Categorizes and extracts tasks and journal content from a single input string.
 */
export const processUserInput = async (input: string, model: string = 'gemini-3-flash-preview'): Promise<AIProcessedInput> => {
  // Always create a new instance right before making an API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      tasks: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'A list of distinct actionable tasks extracted from the user input.'
      },
      journalContent: {
        type: Type.STRING,
        description: 'The narrative or reflective parts of the input, stripped of task-only items.'
      },
      mood: {
        type: Type.STRING,
        description: 'A single word or short phrase representing the detected mood.'
      }
    },
    required: ['tasks', 'journalContent', 'mood']
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `Process this input and separate it into tasks, journal narrative, and mood: "${input}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    return JSON.parse(text) as AIProcessedInput;
  } catch (error) {
    handleAiError(error);
    return { tasks: [], journalContent: null, mood: null };
  }
};

export const extractTasksFromJournal = async (journalText: string, model: string = 'gemini-3-pro-preview'): Promise<{ text: string, priority: Priority }[]> => {
  // Always create a new instance right before making an API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
      contents: `Extract actionable tasks from this journal entry with priority: "${journalText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        thinkingConfig: { thinkingBudget: 1000 }
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

export const generateSubtasks = async (taskText: string, model: string = 'gemini-3-pro-preview'): Promise<string[]> => {
  // Always create a new instance right before making an API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const responseSchema = {
    type: Type.ARRAY,
    items: { type: Type.STRING },
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `Break down this task into steps: "${taskText}"`,
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

export const generateJournalInsight = async (entryText: string, model: string = 'gemini-3-pro-preview'): Promise<string> => {
  // Always create a new instance right before making an API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `Provide one reflective sentence for this entry: "${entryText}"`,
      config: { thinkingConfig: { thinkingBudget: 512 } }
    });
    return response.text || "";
  } catch (error) {
    handleAiError(error);
    return "";
  }
};

export const editJournalText = async (text: string, type: 'IMPROVE' | 'REPHRASE' | 'SUMMARIZE', model: string = 'gemini-3-pro-preview'): Promise<string> => {
  // Always create a new instance right before making an API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompts = {
    IMPROVE: "Improve grammar/flow:",
    REPHRASE: "Rephrase creatively:",
    SUMMARIZE: "Summarize concisely:"
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
  // Always create a new instance right before making an API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: imageModelName,
      contents: {
        parts: [{ text: `Minimalist, soothing cover image for theme: ${context}. No text.` }]
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
