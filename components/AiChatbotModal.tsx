import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, Bot, User, Loader2, PlusCircle, CheckCircle, Database, Cpu, ChevronDown } from './Icons';
import { GoogleGenAI } from '@google/genai';
import { JournalEntry } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  extractedTasks?: string[];
  extractedJournal?: string | null;
  extractedMood?: string | null;
  retrievedMemoriesCount?: number;
}

interface AiChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddData: (tasks: string[], journal: string | null, mood: string | null) => void;
  journalEntries?: JournalEntry[];
  userName?: string;
}

const AVAILABLE_MODELS = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', desc: 'High performance & reasoning' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', desc: 'Fast & responsive' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', desc: 'Deep reasoning & nuance' },
];

const resolveModelToApiName = (modelId: string): string => {
  if (modelId === 'gemini-3.1-pro-preview') return 'gemini-3.1-pro-preview';
  if (modelId === 'gemini-3.5-flash-lite') return 'gemini-3.5-flash-lite';
  return 'gemini-3.6-flash';
};

const getAiClient = () => {
  let apiKey = '';
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

  if (!apiKey) {
    apiKey = 
      (typeof process !== 'undefined' && process.env ? (process.env.GEMINI_API_KEY || process.env.API_KEY) : '') ||
      (typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY) : '') ||
      (typeof window !== 'undefined' && ((window as any).GEMINI_API_KEY || (window as any).API_KEY)) ||
      '';
  }

  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const AiChatbotModal: React.FC<AiChatbotModalProps> = ({ isOpen, onClose, onAddData, journalEntries = [], userName = '' }) => {
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.6-flash');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const initialGreeting = useMemo(() => {
    const nameStr = userName && userName.trim() ? `, ${userName.trim()}` : '';
    return `Hey${nameStr}! I'm right here with you. How are you doing today? Feel free to vent, brainstorm, ask about your past memories, or chat about whatever's on your mind.`;
  }, [userName]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'bot',
          text: initialGreeting,
          timestamp: new Date(),
        }
      ]);
    }
  }, [isOpen, initialGreeting, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // RAG Search Helper: Retrieve relevant entries based on query
  const retrieveRelevantMemories = (query: string, entries: JournalEntry[]): JournalEntry[] => {
    if (!entries || entries.length === 0) return [];
    
    const queryTokens = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
    if (queryTokens.length === 0) {
      return entries.slice(0, 8);
    }

    const scored = entries.map(entry => {
      const text = `${entry.title || ''} ${entry.content || ''} ${entry.mood || ''}`.toLowerCase();
      let score = 0;
      queryTokens.forEach(token => {
        if (text.includes(token)) score += 1;
      });
      return { entry, score };
    });

    const relevant = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.entry);

    if (relevant.length === 0) {
      return entries.slice(0, 6);
    }
    return relevant.slice(0, 8);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // RAG Context Gathering
    const retrieved = retrieveRelevantMemories(userText, journalEntries);
    const ragContextText = retrieved.length > 0 
      ? retrieved.map(m => {
          const dateStr = new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return `[Date: ${dateStr}${m.mood ? ` | Mood: ${m.mood}` : ''}${m.title ? ` | Title: ${m.title}` : ''}]\n${m.content}`;
        }).join('\n---\n')
      : "No previous memories found.";

    try {
      const ai = getAiClient();
      if (!ai) {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            text: "I am listening. (Note: Gemini API key is required for dynamic AI responses. You can set it in Settings.)",
            timestamp: new Date(),
            retrievedMemoriesCount: retrieved.length,
          }
        ]);
        setIsTyping(false);
        return;
      }

      // Conversation history
      const historyContext = messages.slice(-8).map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');

      // Gather full memory awareness
      const allMemoriesText = journalEntries.length > 0
        ? journalEntries.slice(0, 30).map(m => {
            const dateStr = new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return `• [${dateStr}${m.mood ? ` | Mood: ${m.mood}` : ''}${m.title ? ` | ${m.title}` : ''}]: ${m.content}`;
          }).join('\n')
        : "No previous memories saved yet.";

      const displayName = userName && userName.trim() ? userName.trim() : 'my friend';

      const prompt = `You are a warm, genuine, empathetic, and supportive close friend to ${displayName}.
You have full awareness of their journal entries and memories below, so you know what's been happening in their life.

--- SAVED MEMORIES & JOURNAL HISTORY ---
${allMemoriesText}
----------------------------------------

RECENT CHAT HISTORY:
${historyContext}

${displayName.toUpperCase()}'S CURRENT MESSAGE:
"${userText}"

INSTRUCTIONS:
1. Speak naturally like a caring, empathetic best friend. Never sound robotic, clinical, or overly formal.
2. Refer to their past memories or feelings naturally whenever relevant, showing you truly know them and remember their journey.
3. Address them warmly as ${displayName}.
4. Keep the conversation natural, friendly, and supportive.
5. Extract any new action items or journal reflections if implied in their message.

Output strictly a JSON object:
{
  "reply": "Your warm, friendly response addressing ${displayName}",
  "tasks": ["Extracted task 1", "Extracted task 2"],
  "journalContent": "Extracted journal reflection or null",
  "mood": "Detected mood string or null"
}`;

      const targetModel = resolveModelToApiName(selectedModel);
      let response;
      try {
        response = await ai.models.generateContent({
          model: targetModel,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          }
        });
      } catch (err: any) {
        console.warn(`Model ${targetModel} call failed, falling back to gemini-3.6-flash:`, err?.message || err);
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          }
        });
      }

      const responseText = response.text || '';
      let parsed: any = {};
      try {
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleanJson);
      } catch (err) {
        parsed = {
          reply: responseText || `I hear you clearly, ${displayName}. Thank you for sharing.`,
        };
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: parsed.reply || `I hear you, ${displayName}.`,
        timestamp: new Date(),
        extractedTasks: Array.isArray(parsed.tasks) && parsed.tasks.length > 0 ? parsed.tasks : undefined,
        extractedJournal: parsed.journalContent || null,
        extractedMood: parsed.mood || null,
        retrievedMemoriesCount: retrieved.length,
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (e: any) {
      console.error(e);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: `I'm right here with you, ${userName || 'friend'}. Let's continue whenever you're ready.`,
          timestamp: new Date(),
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSaveToZournel = (msg: Message) => {
    const tasks = msg.extractedTasks || [];
    const journal = msg.extractedJournal || null;
    const mood = msg.extractedMood || null;

    if (tasks.length > 0 || journal || mood) {
      onAddData(tasks, journal, mood);
    } else {
      onAddData([], msg.text, '💬 Reflection');
    }

    setAddedIds(prev => ({ ...prev, [msg.id]: true }));
  };

  const currentModelObj = useMemo(() => {
    return AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];
  }, [selectedModel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-md"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="bg-surface rounded-[2.5rem] w-full max-w-2xl h-[88vh] sm:h-[82vh] shadow-2xl relative border border-surface-highlight flex flex-col overflow-hidden text-primary font-sans"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-surface-highlight flex justify-between items-center bg-surface-highlight/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-accent/15 text-accent rounded-2xl border border-accent/25 shadow-xs flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display font-bold text-lg text-primary leading-tight">AI Companion</h2>
                  </div>
                  <p className="text-xs text-secondary font-light">Talking with full awareness of your memories</p>
                </div>
              </div>

              {/* Model Picker & Close */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setIsModelDropdownOpen(prev => !prev)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-highlight/50 hover:bg-surface-highlight text-primary text-xs font-grotesk font-semibold transition border border-surface-highlight"
                  >
                    <Cpu className="w-3.5 h-3.5 text-accent" />
                    <span>{currentModelObj.name}</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>

                  {isModelDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-2xl shadow-xl border border-surface-highlight p-1.5 z-50">
                      <div className="text-[10px] font-grotesk font-bold text-secondary px-2.5 py-1 uppercase tracking-wider">Select Chat Model</div>
                      {AVAILABLE_MODELS.map(m => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedModel(m.id);
                            setIsModelDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl transition text-xs flex flex-col ${
                            selectedModel === m.id
                              ? 'bg-accent/15 text-accent font-semibold'
                              : 'hover:bg-surface-highlight/60 text-primary'
                          }`}
                        >
                          <span className="font-semibold">{m.name}</span>
                          <span className="text-[10px] text-secondary font-light">{m.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  onClick={onClose} 
                  className="p-2 hover:bg-surface-highlight rounded-full transition text-secondary hover:text-primary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-5 no-scrollbar">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                const hasExtracted = (msg.extractedTasks && msg.extractedTasks.length > 0) || msg.extractedJournal || msg.extractedMood;
                const isSaved = addedIds[msg.id];

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0 mt-0.5 border border-accent/20">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div className={`max-w-[85%] sm:max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                      <div className={`p-4 sm:p-5 rounded-2xl text-sm leading-relaxed shadow-xs ${
                        isUser 
                          ? 'bg-accent text-accent-fg font-medium rounded-tr-xs' 
                          : 'bg-surface-highlight/30 text-primary border border-surface-highlight/50 rounded-tl-xs'
                      }`}>
                        {msg.text}
                      </div>

                      {/* RAG Context Badge */}

                      {/* Extracted Data Action Card */}
                      {!isUser && hasExtracted && (
                        <div className="mt-3 p-3.5 rounded-2xl bg-accent/10 border border-accent/20 text-xs w-full">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-grotesk text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Extracted Insights
                            </span>
                            <button
                              onClick={() => handleSaveToZournel(msg)}
                              disabled={isSaved}
                              className={`px-3 py-1 rounded-xl font-bold text-xs flex items-center gap-1 transition ${
                                isSaved 
                                  ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30' 
                                  : 'bg-accent text-accent-fg hover:opacity-90 active:scale-95'
                              }`}
                            >
                              {isSaved ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Saved to Zournel</span>
                                </>
                              ) : (
                                <>
                                  <PlusCircle className="w-3.5 h-3.5" />
                                  <span>Save to Zournel</span>
                                </>
                              )}
                            </button>
                          </div>

                          {msg.extractedMood && (
                            <div className="text-secondary mb-1">
                              <span className="font-semibold text-primary">Mood:</span> {msg.extractedMood}
                            </div>
                          )}

                          {msg.extractedTasks && msg.extractedTasks.length > 0 && (
                            <div className="text-secondary mb-1">
                              <span className="font-semibold text-primary">Action Items:</span>
                              <ul className="list-disc list-inside ml-1 space-y-0.5 mt-0.5">
                                {msg.extractedTasks.map((t, idx) => (
                                  <li key={idx} className="text-primary">{t}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {msg.extractedJournal && (
                            <div className="text-secondary line-clamp-2 italic font-serif mt-1">
                              "{msg.extractedJournal}"
                            </div>
                          )}
                        </div>
                      )}

                      <span className="text-[10px] text-secondary/60 mt-1 px-1 font-grotesk">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-surface-highlight text-secondary flex items-center justify-center shrink-0 mt-0.5 border border-surface-highlight">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0 border border-accent/20">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl bg-surface-highlight/30 border border-surface-highlight/50 rounded-tl-xs flex items-center gap-2 text-secondary text-xs font-grotesk">
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                    <span>Reflecting on your memories...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-surface-highlight bg-surface/80 backdrop-blur-md shrink-0">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2 bg-surface-highlight/40 rounded-2xl p-2 border border-surface-highlight focus-within:border-accent transition shadow-xs"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={userName ? `Talk through what's on your mind, ${userName.trim()}...` : "Talk through what's on your mind..."}
                  className="flex-grow bg-transparent px-3 py-1.5 text-sm text-primary placeholder:text-secondary/50 outline-none"
                  disabled={isTyping}
                />
                <button
                  type="submit"
                  disabled={isTyping || !input.trim()}
                  className={`p-2.5 rounded-xl transition ${
                    isTyping || !input.trim()
                      ? 'bg-surface-highlight text-secondary/40 cursor-not-allowed'
                      : 'bg-accent text-accent-fg hover:opacity-90 active:scale-95 shadow-xs'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
