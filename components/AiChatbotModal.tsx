import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, Bot, User, Loader2, PlusCircle, CheckCircle, Database, Cpu, ChevronDown, Copy, ThumbsUp, ThumbsDown, Share2, RotateCw, MoreHorizontal, Mic, AudioLines, Plus, Check } from './Icons';
import { GoogleGenAI } from '@google/genai';
import { JournalEntry } from '../types';
import { iosSpring, iosSpringGentle, triggerHaptic } from '../utils/uiSprings';

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
  apiKey?: string;
  onUpdateApiKey?: (key: string) => void;
}

const AVAILABLE_MODELS = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', desc: 'High performance & reasoning' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', desc: 'Fast & responsive' },
  { id: 'gemma-4-31b-it', name: 'Gemma 4-31B-it', desc: 'Open weights & deep reasoning' },
];

const resolveModelToApiName = (modelId: string): string => {
  if (modelId === 'gemma-4-31b-it') return 'gemma-4-31b-it';
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

export const AiChatbotModal: React.FC<AiChatbotModalProps> = ({ 
  isOpen, 
  onClose, 
  onAddData, 
  journalEntries = [], 
  userName = '', 
  apiKey = '', 
  onUpdateApiKey 
}) => {
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.6-flash');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isThinkEnabled, setIsThinkEnabled] = useState(true);
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState<string | null>(null); // messageId for more menu
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, 'up' | 'down'>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const hasApiKey = Boolean(
    apiKey?.trim() || 
    (typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem('mf_settings') || '{}').apiKey) ||
    (typeof process !== 'undefined' && process.env && (process.env.GEMINI_API_KEY || process.env.API_KEY)) ||
    (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY))
  );

  const handleSaveBannerKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (customKeyInput.trim()) {
      if (onUpdateApiKey) {
        onUpdateApiKey(customKeyInput.trim());
      } else {
        try {
          const current = JSON.parse(localStorage.getItem('mf_settings') || '{}');
          current.apiKey = customKeyInput.trim();
          localStorage.setItem('mf_settings', JSON.stringify(current));
        } catch (e) {}
      }
      setBannerDismissed(true);
      setCustomKeyInput('');
      showToast("API Key saved successfully!");
    }
  };

  const initialGreeting = useMemo(() => {
    const nameStr = userName && userName.trim() ? `, ${userName.trim()}` : '';
    return `Hey${nameStr}! I'm right here with you. How are you doing today? Feel free to vent, brainstorm, ask about your past memories, or chat about whatever's on your mind.`;
  }, [userName]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText !== undefined ? customText : input;
    if (!textToSend.trim() || isTyping) return;

    const userText = textToSend.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    if (customText === undefined) setInput('');
    setIsTyping(true);

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
          }
        ]);
        setIsTyping(false);
        return;
      }

      const historyContext = messages.slice(-8).map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
      const allMemoriesText = journalEntries.length > 0
        ? journalEntries.slice(0, 30).map(m => {
            const dateStr = new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return `• [${dateStr}${m.mood ? ` | Mood: ${m.mood}` : ''}${m.title ? ` | ${m.title}` : ''}]: ${m.content}`;
          }).join('\n')
        : "No previous memories saved yet.";

      const displayName = userName && userName.trim() ? userName.trim() : 'my friend';

      const prompt = `You are a warm, genuine, empathetic, and supportive close friend to ${displayName}.
You have full awareness of their journal entries and memories below, so you know what's been happening in their life.
${isThinkEnabled ? 'DEEP REASONING MODE: Analyze deeply, connect patterns across memories, and provide thoughtful, highly structured guidance.' : ''}

--- SAVED MEMORIES & JOURNAL HISTORY ---
${allMemoriesText}
----------------------------------------

RECENT CHAT HISTORY:
${historyContext}

${displayName.toUpperCase()}'S CURRENT MESSAGE:
"${userText}"

INSTRUCTIONS:
1. Speak naturally like a caring, empathetic best friend. Never sound robotic, clinical, or overly formal.
2. Refer to their past memories or feelings naturally whenever relevant.
3. Address them warmly as ${displayName}.
4. Extract any new action items or journal reflections if implied in their message.

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
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (e: any) {
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
    showToast("Successfully saved to Zournel!");
  };

  const handleAttachOption = (option: string) => {
    setIsAttachOpen(false);
    if (option === 'recent') {
      const latest = journalEntries[journalEntries.length - 1];
      if (latest) {
        setInput(`Can you review my latest journal entry from ${new Date(latest.createdAt).toLocaleDateString()} titled "${latest.title || 'Untitled'}"?`);
      } else {
        showToast("No journal entries found to attach.");
      }
    } else if (option === 'summary') {
      handleSendMessage("Can you summarize my recent memories and emotional patterns for the week?");
    } else if (option === 'tasks') {
      handleSendMessage("Can you review my memories and extract all pending action items and tasks for me?");
    }
  };

  const handleSpeakMessage = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
      showToast("Reading message aloud...");
    } else {
      showToast("Speech synthesis is not supported in this browser.");
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        showToast("Listening... Speak now");
      };

      recognition.onresult = (event: any) => {
        const speechText = event.results[0][0].transcript;
        setInput(speechText);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
        showToast("Voice recognition error. Please try again.");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      showToast("Voice dictation is not supported in this browser.");
    }
  };

  const handleRegenerate = () => {
    const userMessages = messages.filter(m => m.sender === 'user');
    const lastUserMsg = userMessages[userMessages.length - 1];
    if (lastUserMsg) {
      // Remove last bot message and re-send last user message
      setMessages(prev => prev.slice(0, prev.length - 1));
      handleSendMessage(lastUserMsg.text);
    }
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
          className="fixed inset-0 z-50 flex flex-col w-screen h-screen m-0 p-0 bg-[#121212] text-slate-100 font-sans overflow-hidden"
        >
          {/* Toast Notification */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-accent text-accent-fg font-medium text-xs shadow-xl flex items-center gap-2 border border-white/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="flex flex-col w-full h-full bg-[#121212] relative overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center bg-[#181818] shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-accent/15 text-accent rounded-2xl border border-accent/25 shadow-xs flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display font-bold text-lg text-slate-100 leading-tight">AI Companion</h2>
                  </div>
                  <p className="text-xs text-slate-400 font-light">Talking with full awareness of your memories</p>
                </div>
              </div>

              {/* Model Picker & Close */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => setIsModelDropdownOpen(prev => !prev)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-slate-200 text-xs font-grotesk font-semibold transition border border-neutral-700"
                  >
                    <Cpu className="w-3.5 h-3.5 text-accent" />
                    <span>{currentModelObj.name}</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>

                  {isModelDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a1a] rounded-2xl shadow-xl border border-neutral-700 p-1.5 z-50">
                      <div className="text-[10px] font-grotesk font-bold text-slate-400 px-2.5 py-1 uppercase tracking-wider">Select Chat Model</div>
                      {AVAILABLE_MODELS.map(m => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedModel(m.id);
                            setIsModelDropdownOpen(false);
                            showToast(`Switched model to ${m.name}`);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl transition text-xs flex flex-col ${
                            selectedModel === m.id
                              ? 'bg-accent/20 text-accent font-semibold'
                              : 'hover:bg-neutral-800 text-slate-200'
                          }`}
                        >
                          <span className="font-semibold">{m.name}</span>
                          <span className="text-[10px] text-slate-400 font-light">{m.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  onClick={onClose} 
                  className="p-2.5 hover:bg-neutral-800 rounded-full transition text-slate-400 hover:text-slate-100"
                  title="Close Full Screen"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Non-intrusive API Key setup banner if key is not configured */}
            {!hasApiKey && !bannerDismissed && (
              <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shrink-0">
                <div className="flex items-center gap-2 text-amber-200">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Connect Gemini for real-time memory analysis &amp; personalized replies</span>
                </div>
                <form onSubmit={handleSaveBannerKey} className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="password"
                    value={customKeyInput}
                    onChange={(e) => setCustomKeyInput(e.target.value)}
                    placeholder="Paste API Key..."
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-slate-100 font-mono outline-none focus:ring-1 focus:ring-amber-500 w-full sm:w-44"
                  />
                  <button
                    type="submit"
                    disabled={!customKeyInput.trim()}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-semibold text-xs disabled:opacity-40 hover:bg-amber-700 transition shrink-0"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setBannerDismissed(true)}
                    className="p-1 text-slate-400 hover:text-slate-100 transition shrink-0"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* Chat Messages */}
            <div className="flex-grow overflow-y-auto px-6 py-6 sm:px-12 md:px-24 lg:px-48 space-y-6 no-scrollbar bg-[#121212]">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                const hasExtracted = (msg.extractedTasks && msg.extractedTasks.length > 0) || msg.extractedJournal || msg.extractedMood;
                const isSaved = addedIds[msg.id];
                const feedback = feedbackState[msg.id];
                const isCopied = copiedId === msg.id;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
                  >
                    <div className={`flex gap-3 sm:gap-4 max-w-[88%] sm:max-w-[82%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isUser ? 'bg-neutral-800 text-slate-300 border border-neutral-700' : 'bg-accent/20 text-accent border border-accent/30'
                      }`}>
                        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>

                      <div className={`p-4 sm:p-5 rounded-2xl text-sm sm:text-base leading-relaxed shadow-sm ${
                        isUser 
                          ? 'bg-[#6b21a8] text-white font-medium rounded-tr-xs' 
                          : 'bg-[#1a1a1a] text-slate-100 border border-neutral-800 rounded-tl-xs'
                      }`}>
                        {msg.text}
                      </div>
                    </div>

                    {/* Bot Message Action Toolbar */}
                    {!isUser && (
                      <div className="flex items-center gap-1.5 ml-11 mt-1 text-slate-400 text-xs">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(msg.text);
                            setCopiedId(msg.id);
                            triggerHaptic(10);
                            showToast("Copied message to clipboard!");
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="p-1.5 hover:bg-neutral-800 rounded-lg transition hover:text-slate-200 flex items-center gap-1" 
                          title="Copy"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        <button 
                          onClick={() => {
                            setFeedbackState(prev => ({ ...prev, [msg.id]: 'down' }));
                            showToast("Feedback noted. Thank you!");
                          }}
                          className={`p-1.5 hover:bg-neutral-800 rounded-lg transition ${feedback === 'down' ? 'text-red-400 bg-neutral-800' : 'hover:text-slate-200'}`} 
                          title="Thumbs Down"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>

                        <button 
                          onClick={() => {
                            setFeedbackState(prev => ({ ...prev, [msg.id]: 'up' }));
                            showToast("Thanks for your positive feedback!");
                          }}
                          className={`p-1.5 hover:bg-neutral-800 rounded-lg transition ${feedback === 'up' ? 'text-emerald-400 bg-neutral-800' : 'hover:text-slate-200'}`} 
                          title="Thumbs Up"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>

                        <button 
                          onClick={() => {
                            if (navigator.share) {
                              navigator.share({ title: 'AI Companion Insight', text: msg.text }).catch(() => {});
                            } else {
                              navigator.clipboard.writeText(msg.text);
                              showToast("Message copied for sharing!");
                            }
                          }}
                          className="p-1.5 hover:bg-neutral-800 rounded-lg transition hover:text-slate-200" 
                          title="Share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        <button 
                          onClick={() => handleRegenerate()}
                          className="p-1.5 hover:bg-neutral-800 rounded-lg transition hover:text-slate-200" 
                          title="Regenerate response"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>

                        <button 
                          onClick={() => handleSpeakMessage(msg.text)}
                          className="p-1.5 hover:bg-neutral-800 rounded-lg transition hover:text-slate-200" 
                          title="Read aloud"
                        >
                          <AudioLines className="w-3.5 h-3.5" />
                        </button>

                        <div className="relative">
                          <button 
                            onClick={() => setIsMoreOpen(isMoreOpen === msg.id ? null : msg.id)}
                            className="p-1.5 hover:bg-neutral-800 rounded-lg transition hover:text-slate-200" 
                            title="More options"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>

                          {isMoreOpen === msg.id && (
                            <div className="absolute left-0 top-full mt-1 w-48 bg-[#1f1f1f] rounded-2xl shadow-xl border border-neutral-700 p-1.5 z-50">
                              <button
                                onClick={() => {
                                  handleSaveToZournel(msg);
                                  setIsMoreOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-neutral-800 text-slate-200 transition"
                              >
                                Save to Zournel
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(msg.text);
                                  setIsMoreOpen(null);
                                  showToast("Raw text copied!");
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-neutral-800 text-slate-200 transition"
                              >
                                Copy Raw Text
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Extracted Data Action Card */}
                    {!isUser && hasExtracted && (
                      <div className="mt-3 ml-11 p-4 rounded-2xl bg-accent/10 border border-accent/20 text-xs w-[calc(100%-44px)] max-w-lg">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-grotesk text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Extracted Insights
                          </span>
                          <button
                            onClick={() => handleSaveToZournel(msg)}
                            disabled={isSaved}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition ${
                              isSaved 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
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
                          <div className="text-slate-300 mb-1">
                            <span className="font-semibold text-slate-100">Mood:</span> {msg.extractedMood}
                          </div>
                        )}

                        {msg.extractedTasks && msg.extractedTasks.length > 0 && (
                          <div className="text-slate-300 mb-1">
                            <span className="font-semibold text-slate-100">Action Items:</span>
                            <ul className="list-disc list-inside ml-1 space-y-0.5 mt-0.5">
                              {msg.extractedTasks.map((t, idx) => (
                                <li key={idx} className="text-slate-200">{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {msg.extractedJournal && (
                          <div className="text-slate-300 line-clamp-2 italic font-serif mt-1">
                            "{msg.extractedJournal}"
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center shrink-0 border border-accent/30">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl bg-[#1a1a1a] border border-neutral-800 rounded-tl-xs flex items-center gap-2 text-slate-400 text-xs font-grotesk">
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                    <span>{isThinkEnabled ? 'Reasoning deeply across your memories...' : 'Reflecting on your memories...'}</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 sm:p-6 border-t border-neutral-800 bg-[#121212] shrink-0 flex justify-center">
              <div className="w-full max-w-4xl relative">
                {/* Attachment Menu Popup */}
                {isAttachOpen && (
                  <div className="absolute bottom-full mb-3 left-0 w-64 bg-[#1f1f1f] rounded-2xl shadow-2xl border border-neutral-700 p-2 z-50">
                    <div className="text-[10px] font-grotesk font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">Attach Memory Context</div>
                    <button
                      onClick={() => handleAttachOption('recent')}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs hover:bg-neutral-800 text-slate-200 transition flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      <span>Reference Recent Journal</span>
                    </button>
                    <button
                      onClick={() => handleAttachOption('summary')}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs hover:bg-neutral-800 text-slate-200 transition flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Summarize Recent Week</span>
                    </button>
                    <button
                      onClick={() => handleAttachOption('tasks')}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs hover:bg-neutral-800 text-slate-200 transition flex items-center gap-2"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Extract Pending Action Items</span>
                    </button>
                  </div>
                )}

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[#1a1a1a] rounded-3xl sm:rounded-full p-3 sm:px-4 sm:py-3 border border-neutral-800 focus-within:border-accent transition shadow-xl"
                >
                  <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-grow">
                      <button
                        type="button"
                        onClick={() => setIsAttachOpen(prev => !prev)}
                        className="w-9 h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 text-slate-300 flex items-center justify-center transition shrink-0"
                        title="Attach memories or prompt presets"
                      >
                        <Plus className="w-4 h-4" />
                      </button>

                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={userName ? `Ask anything, ${userName.trim()}...` : "Ask anything"}
                        className="flex-grow bg-transparent px-2 sm:px-3 py-1 text-sm sm:text-base text-slate-100 placeholder:text-slate-500 outline-none"
                        disabled={isTyping}
                      />
                    </div>

                    {/* Mobile Send Button in top row */}
                    {input.trim() && (
                      <button
                        type="submit"
                        disabled={isTyping || !input.trim()}
                        className="sm:hidden p-2.5 rounded-full bg-accent text-accent-fg hover:opacity-90 active:scale-95 transition shadow-xs shrink-0"
                        title="Send message"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800">
                    <button
                      type="button"
                      onClick={() => {
                        setIsThinkEnabled(prev => !prev);
                        showToast(!isThinkEnabled ? "Deep reasoning Think mode enabled" : "Think mode disabled");
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition border ${
                        isThinkEnabled 
                          ? 'bg-neutral-800 border-neutral-700 text-accent' 
                          : 'bg-neutral-900 border-neutral-800 text-slate-400'
                      }`}
                      title="Toggle Think mode"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Think</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleVoiceInput}
                      className={`p-2 transition rounded-full hover:bg-neutral-800 ${isListening ? 'text-red-400 animate-pulse bg-neutral-800' : 'text-slate-400 hover:text-slate-100'}`}
                      title="Voice input dictation"
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const lastBotMsg = messages.filter(m => m.sender === 'bot').pop();
                        if (lastBotMsg) {
                          handleSpeakMessage(lastBotMsg.text);
                        } else {
                          showToast("No response to speak yet.");
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-[#3b1f5e] hover:bg-[#4a2779] text-purple-200 flex items-center justify-center transition shrink-0 shadow-sm"
                      title="Read last response aloud"
                    >
                      <AudioLines className="w-4 h-4" />
                    </button>

                    {input.trim() && (
                      <button
                        type="submit"
                        disabled={isTyping || !input.trim()}
                        className="hidden sm:flex p-2.5 rounded-full bg-accent text-accent-fg hover:opacity-90 active:scale-95 transition shadow-xs shrink-0"
                        title="Send message"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
