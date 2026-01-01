import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AIProcessedInput, Priority } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const modelName = 'gemini-3-flash-preview';
const imageModelName = 'gemini-2.5-flash-image';

/**
 * Classifies raw user input into actionable tasks and/or journal content.
 */
export const processUserInput = async (input: string): Promise<AIProcessedInput> => {
  if (!apiKey) throw new Error("API Key missing");

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
      model: modelName,
      contents: `Analyze the following input. Separate actionable to-do items from personal reflections. 
      Input: "${input}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are a helpful personal assistant. Your goal is to strictly separate tasks from journal thoughts. If the input is ambiguous, bias towards Journal if it contains feelings, and Task if it contains verbs/objects.",
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

/**
 * Strictly extracts tasks from a text that is primarily a journal entry, including priority.
 */
export const extractTasksFromJournal = async (journalText: string): Promise<{ text: string, priority: Priority }[]> => {
  if (!apiKey) return [];

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
      model: modelName,
      contents: `Read this journal entry and extract any implicit or explicit tasks/to-dos. Assign a priority (high/medium/low) based on urgency or emotional weight in the text.
      Journal Entry: "${journalText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
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

/**
 * Generates subtasks for a complex task.
 */
export const generateSubtasks = async (taskText: string): Promise<string[]> => {
  if (!apiKey) return [];

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: { type: Type.STRING },
  };

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Break down this task into 3-5 smaller, actionable steps: "${taskText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    return text ? JSON.parse(text) : [];
  } catch (error) {
    console.error("Subtask Generation Error:", error);
    return [];
  }
};

/**
 * Generates a brief reflective insight for a journal entry.
 */
export const generateJournalInsight = async (entryText: string): Promise<string> => {
  if (!apiKey) return "";

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Provide a single sentence, deep, philosophical or supportive insight based on this journal entry: "${entryText}"`,
    });

    return response.text || "";
  } catch (error) {
    console.error("Insight Generation Error:", error);
    return "";
  }
};

/**
 * Improves or modifies journal text.
 */
export const editJournalText = async (text: string, type: 'IMPROVE' | 'REPHRASE' | 'SUMMARIZE'): Promise<string> => {
  if (!apiKey) return text;
  
  let prompt = "";
  switch (type) {
    case 'IMPROVE':
      prompt = "Improve the grammar, flow, and tone of this writing while keeping the original meaning:";
      break;
    case 'REPHRASE':
      prompt = "Rephrase this text to be more creative and expressive:";
      break;
    case 'SUMMARIZE':
      prompt = "Summarize this into a concise reflection:";
      break;
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `${prompt} "${text}"`,
    });
    return response.text || text;
  } catch (error) {
    console.error("Text Edit Error:", error);
    return text;
  }
};

/**
 * Generates a cover image based on text.
 */
export const generateCoverImage = async (context: string): Promise<string | null> => {
  if (!apiKey) return null;

  try {
    const response = await ai.models.generateContent({
      model: imageModelName,
      contents: {
        parts: [
          { text: `Generate a minimalist, artistic, and soothing cover image that represents this mood/theme: ${context || "peaceful reflection"}. Do not include text in the image.` }
        ]
      },
      config: {
        // No schema/mime type for image models usually unless specific endpoint
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Image Generation Error:", error);
    return null;
  }
};