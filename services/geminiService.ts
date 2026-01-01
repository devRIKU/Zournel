import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AIProcessedInput, Priority } from "../types";

const textModelName = 'gemini-3-pro-preview';
const imageModelName = 'gemini-3-pro-image-preview';

/**
 * Helper to get fresh AI instance to ensure it uses the latest selected API key
 */
const getAi = () => {
  const apiKey = process.env.API_KEY || '';
  return new GoogleGenAI({ apiKey });
};

export const processUserInput = async (input: string): Promise<AIProcessedInput> => {
  const ai = getAi();
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      tasks: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of specific actionable tasks extracted from the text.",
      },
      journalContent: {
        type: Type.STRING,
        description: "Any non-task narrative, reflection, or feelings suitable for a journal entry. Null if none.",
      },
      mood: {
        type: Type.STRING,
        description: "A single word describing the emotional tone (e.g., Anxious, Happy, Determined).",
      }
    },
    required: ["tasks"],
  };

  try {
    const response = await ai.models.generateContent({
      model: textModelName,
      contents: `Analyze the following input. Separate actionable to-do items from personal reflections. 
      Input: "${input}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are a helpful personal assistant. Separate tasks from journal thoughts. Be intelligent about identifying priorities.",
        thinkingConfig: { thinkingBudget: 2000 }
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AIProcessedInput;
  } catch (error) {
    console.error("AI Processing Error:", error);
    return { tasks: [input], journalContent: null, mood: null };
  }
};

export const extractTasksFromJournal = async (journalText: string): Promise<{ text: string, priority: Priority }[]> => {
  const ai = getAi();
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      tasks: {
        type: Type.ARRAY,
        items: { 
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] }
          },
          required: ['text', 'priority']
        },
        description: "Actionable tasks found in the journal entry with their inferred priority.",
      }
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: textModelName,
      contents: `Read this journal entry and extract any implicit or explicit tasks. Assign priority based on emotional weight.
      Journal Entry: "${journalText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        thinkingConfig: { thinkingBudget: 2000 }
      },
    });

    const text = response.text;
    const result = text ? JSON.parse(text) : { tasks: [] };
    return result.tasks || [];
  } catch (error) {
    console.error("Task Extraction Error:", error);
    return [];
  }
};

export const generateSubtasks = async (taskText: string): Promise<string[]> => {
  const ai = getAi();
  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: { type: Type.STRING },
  };

  try {
    const response = await ai.models.generateContent({
      model: textModelName,
      contents: `Break down this task into 3-5 smaller, actionable steps: "${taskText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        thinkingConfig: { thinkingBudget: 1000 }
      },
    });

    const text = response.text;
    return text ? JSON.parse(text) : [];
  } catch (error) {
    console.error("Subtask Generation Error:", error);
    return [];
  }
};

export const generateJournalInsight = async (entryText: string): Promise<string> => {
  const ai = getAi();
  try {
    const response = await ai.models.generateContent({
      model: textModelName,
      contents: `Provide a single sentence, deep reflective insight based on this journal entry: "${entryText}"`,
      config: {
        thinkingConfig: { thinkingBudget: 1000 }
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Insight Generation Error:", error);
    return "";
  }
};

export const editJournalText = async (text: string, type: 'IMPROVE' | 'REPHRASE' | 'SUMMARIZE'): Promise<string> => {
  const ai = getAi();
  let prompt = "";
  switch (type) {
    case 'IMPROVE': prompt = "Improve the grammar and flow:"; break;
    case 'REPHRASE': prompt = "Rephrase this to be more expressive:"; break;
    case 'SUMMARIZE': prompt = "Summarize this into a concise reflection:"; break;
  }

  try {
    const response = await ai.models.generateContent({
      model: textModelName,
      contents: `${prompt} "${text}"`,
      config: { thinkingConfig: { thinkingBudget: 1000 } }
    });
    return response.text || text;
  } catch (error) {
    return text;
  }
};

export const generateCoverImage = async (context: string): Promise<string | null> => {
  const ai = getAi();
  try {
    const response = await ai.models.generateContent({
      model: imageModelName,
      contents: {
        parts: [{ text: `Generate a minimalist, soothing, artistic cover image representing this theme: ${context}. No text.` }]
      },
      config: {
        imageConfig: { aspectRatio: "16:9", imageSize: "1K" }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Generation Error:", error);
    return null;
  }
};