import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, X, Send, Bot, User, Loader2, PlusCircle, CheckCircle, 
  Database, Cpu, ChevronDown, Copy, ThumbsUp, ThumbsDown, Share2, 
  RotateCw, MoreHorizontal, Mic, AudioLines, Plus, Check,
  PanelLeft, Brain, Trash2, Volume2, VolumeX, MessageSquare, Clock
} from './Icons';
import { JournalEntry, ChatSession, ChatMessage, ModelTier } from '../types';
import { TIERS, tierName, readSettings } from '../services/modelConfig';
import { generateJson } from '../services/geminiService';
import { retrieveOptimizedContext, getStoredMemories } from '../services/memoryService';
import { edgeTts, EDGE_VOICES, EdgeVoiceOption } from '../services/edgeTtsService';
import { AiMemoriesModal } from './AiMemoriesModal';

interface AiChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddData: (tasks: string[], journal: string | null, mood: string | null) => void;
  journalEntries?: JournalEntry[];
  userName?: string;
  apiKey?: string;
  onUpdateApiKey?: (key: string) => void;
}

const SESSIONS_STORAGE_KEY = 'zournel_ai_chat_sessions';
const ACTIVE_SESSION_STORAGE_KEY = 'zournel_active_chat_session_id';

export const AiChatbotModal: React.FC<AiChatbotModalProps> = ({ 
  isOpen, 
  onClose, 
  onAddData, 
  journalEntries = [], 
  userName = '', 
  apiKey = '', 
  onUpdateApiKey 
}) => {
  const [selectedModel, setSelectedModel] = useState<ModelTier>(readSettings().activeTier || 'lantern');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isThinkEnabled, setIsThinkEnabled] = useState(true);
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, 'up' | 'down'>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Sidebar & Sessions State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Memories Modal State
  const [isMemoriesModalOpen, setIsMemoriesModalOpen] = useState(false);
  const [memoriesCount, setMemoriesCount] = useState<number>(() => getStoredMemories().length);
  const [expandedMemoryMsgId, setExpandedMemoryMsgId] = useState<string | null>(null);

  // Microsoft Edge TTS State
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);
  const [activeTtsSnippet, setActiveTtsSnippet] = useState<string>('');
  const [selectedEdgeVoice, setSelectedEdgeVoice] = useState<EdgeVoiceOption>(() => edgeTts.getSelectedVoice());
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);

  // Active chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Subscribe to Edge TTS engine
  useEffect(() => {
    const unsubscribe = edgeTts.subscribe((speaking, snippet) => {
      setIsSpeakingAudio(speaking);
      if (snippet) setActiveTtsSnippet(snippet);
    });
    return () => {
      unsubscribe();
      edgeTts.stop();
    };
  }, []);

  // Load chat sessions from local storage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (raw) {
        const parsed: ChatSession[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          const lastActiveId = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
          const found = parsed.find(s => s.id === lastActiveId) || parsed[0];
          setActiveSessionId(found.id);
          setMessages(found.messages || []);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load chat sessions:', e);
    }
    // Start with a clean empty session without greetings
    const newId = `session_${Date.now()}`;
    setActiveSessionId(newId);
    setMessages([]);
  }, [isOpen]);

  // Save active session changes
  const saveCurrentSession = (updatedMessages: ChatMessage[], titleHint?: string) => {
    if (!activeSessionId) return;

    setSessions(prev => {
      const existing = prev.find(s => s.id === activeSessionId);
      const title = existing?.title && existing.title !== 'New Conversation' 
        ? existing.title 
        : (titleHint || 'New Conversation');

      let updatedList: ChatSession[];
      if (existing) {
        updatedList = prev.map(s => s.id === activeSessionId 
          ? { ...s, messages: updatedMessages, title, updatedAt: Date.now() }
          : s
        );
      } else {
        const newSession: ChatSession = {
          id: activeSessionId,
          title,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: updatedMessages
        };
        updatedList = [newSession, ...prev];
      }
      try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updatedList));
        localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeSessionId);
      } catch (e) {}
      return updatedList;
    });
  };

  const handleNewChat = () => {
    edgeTts.stop();
    const newId = `session_${Date.now()}`;
    setActiveSessionId(newId);
    setMessages([]);
    setInput('');
    setIsSidebarOpen(false);
    try {
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, newId);
    } catch (e) {}
    showToast("Started a new conversation");
  };

  const handleSelectSession = (session: ChatSession) => {
    edgeTts.stop();
    setActiveSessionId(session.id);
    setMessages(session.messages || []);
    setIsSidebarOpen(false);
    try {
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, session.id);
    } catch (e) {}
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== sessionId);
    setSessions(updated);
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}

    if (activeSessionId === sessionId) {
      if (updated.length > 0) {
        handleSelectSession(updated[0]);
      } else {
        handleNewChat();
      }
    }
    showToast("Chat deleted");
  };

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
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (customText === undefined) setInput('');
    setIsTyping(true);

    // Auto-title session from first user message
    const titleHint = userText.length > 32 ? userText.slice(0, 32).trim() + '...' : userText;
    saveCurrentSession(newMessages, titleHint);

    try {
      // OPTIMIZED MEMORY RETRIEVAL (RAG): Pull only relevant context
      const { formattedContext, referencedMemories, retrievedCount } = retrieveOptimizedContext({
        query: userText,
        recentHistory: newMessages.filter(m => m.sender === 'user').map(m => m.text),
        journalEntries,
        maxEntries: 4
      });

      const historyContext = newMessages.slice(-8).map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
      const displayName = userName && userName.trim() ? userName.trim() : 'friend';

      const prompt = `You are a warm, genuine, empathetic, and supportive close companion to ${displayName}.
You have direct awareness of their life through their indexed memories and core facts below.
${isThinkEnabled ? 'DEEP REASONING MODE: Analyze deeply, connect patterns across memories, and provide thoughtful guidance.' : ''}

${formattedContext}

RECENT CHAT HISTORY:
${historyContext}

${displayName.toUpperCase()}'S CURRENT MESSAGE:
"${userText}"

INSTRUCTIONS:
1. Speak naturally like a caring, empathetic best friend. Never sound robotic or clinical.
2. Refer to their past memories or feelings naturally when relevant.
3. Address them warmly as ${displayName}.
4. Extract any new action items or journal reflections if implied in their message.

Output strictly a JSON object:
{
  "reply": "Your warm, friendly response addressing ${displayName}",
  "tasks": ["Extracted task 1", "Extracted task 2"],
  "journalContent": "Extracted journal reflection or null",
  "mood": "Detected mood string or null"
}`;

      // One call on whichever provider this tier is mapped to; falls back to the
      // next model the provider offers before giving up.
      const responseText = await generateJson(prompt, selectedModel) || '';
      let parsed: any = {};
      try {
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleanJson);
      } catch (err) {
        parsed = {
          reply: responseText || `I hear you clearly, ${displayName}. Thank you for sharing.`,
        };
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: parsed.reply || `I hear you, ${displayName}.`,
        timestamp: new Date(),
        extractedTasks: Array.isArray(parsed.tasks) && parsed.tasks.length > 0 ? parsed.tasks : undefined,
        extractedJournal: parsed.journalContent || null,
        extractedMood: parsed.mood || null,
        retrievedMemoriesCount: retrievedCount,
        referencedMemories: referencedMemories
      };

      const finalList = [...newMessages, botMsg];
      setMessages(finalList);
      saveCurrentSession(finalList);
    } catch (e: any) {
      const fallbackMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: `I'm right here with you, ${userName || 'friend'}. Let's continue whenever you're ready.`,
        timestamp: new Date(),
      };
      const finalList = [...newMessages, fallbackMsg];
      setMessages(finalList);
      saveCurrentSession(finalList);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSaveToZournel = (msg: ChatMessage) => {
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

  // MICROSOFT EDGE TTS
  const handleSpeakWithEdgeTts = (text: string) => {
    if (edgeTts.isSpeaking()) {
      edgeTts.stop();
      showToast("Audio stopped");
    } else {
      edgeTts.speak(text, selectedEdgeVoice.id);
      showToast(`Speaking via ${selectedEdgeVoice.name}`);
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
      setMessages(prev => prev.slice(0, prev.length - 1));
      handleSendMessage(lastUserMsg.text);
    }
  };

  // Group chat history by date
  const groupedSessions = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - (6 * 86400000);

    const groups: {
      today: ChatSession[];
      yesterday: ChatSession[];
      previousWeek: ChatSession[];
      older: ChatSession[];
    } = {
      today: [],
      yesterday: [],
      previousWeek: [],
      older: []
    };

    sessions.forEach(s => {
      const t = s.updatedAt || s.createdAt;
      if (t >= todayStart) groups.today.push(s);
      else if (t >= yesterdayStart) groups.yesterday.push(s);
      else if (t >= weekStart) groups.previousWeek.push(s);
      else groups.older.push(s);
    });

    return groups;
  }, [sessions]);

  const currentModelName = useMemo(() => tierName(selectedModel), [selectedModel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex w-screen h-screen m-0 p-0 bg-surface-lowest text-primary font-sans overflow-hidden"
        >
          {/* Toast Notification */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-accent text-accent-fg font-medium text-xs shadow-xl flex items-center gap-2 border border-white/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SIDEBAR: Slide-out drawer on mobile, docked panel on desktop */}
          {/* Mobile backdrop */}
          {isSidebarOpen && (
            <div 
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
          )}

          <aside className={`
            fixed lg:static inset-y-0 left-0 z-50 
            w-72 sm:w-80 bg-surface-lowest border-r border-surface-highlight 
            flex flex-col shrink-0 transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-72'}
            ${!isSidebarOpen ? 'lg:hidden' : 'lg:flex'}
          `}>
            {/* Sidebar Top: Branding & Close */}
            <div className="p-4 border-b border-surface-highlight flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-accent/20 border border-accent/30 text-accent flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-primary">Zournel AI</h3>
                  <p className="text-[10px] font-mono text-secondary/70">Contextual Companion</p>
                </div>
              </div>

              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 rounded-lg text-secondary/70 hover:text-primary hover:bg-surface-highlight/60 transition lg:hidden"
                title="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Top Action 1: New Chat Button */}
            <div className="p-3 pb-2">
              <button
                onClick={handleNewChat}
                className="w-full py-2.5 px-4 rounded-xl bg-accent text-accent-fg font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-95 active:scale-98 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Chat</span>
              </button>
            </div>

            {/* Top Action 2: Memories Button */}
            <div className="px-3 pb-3">
              <button
                onClick={() => {
                  setIsMemoriesModalOpen(true);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className="w-full py-2.5 px-3.5 rounded-xl bg-surface hover:bg-surface-highlight/60 border border-surface-highlight hover:border-accent/40 text-primary text-xs font-medium flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" />
                  <span>Memories</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface-highlight/50 text-secondary border border-surface-highlight">
                  {memoriesCount} facts
                </span>
              </button>
            </div>

            {/* Chat History Section */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
              <div className="flex items-center justify-between px-2 text-[10px] font-mono uppercase tracking-wider text-secondary/70">
                <span>Chat History</span>
                <Clock className="w-3 h-3 text-secondary/70" />
              </div>

              {sessions.length === 0 ? (
                <div className="text-center py-10 px-4 text-xs text-secondary/70 border border-dashed border-surface-highlight/80 rounded-xl">
                  No previous conversations yet. Start typing to begin.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Today */}
                  {groupedSessions.today.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-secondary/70 px-2 block">Today</span>
                      {groupedSessions.today.map(session => (
                        <div
                          key={session.id}
                          onClick={() => handleSelectSession(session)}
                          className={`group w-full text-left p-2.5 rounded-xl transition flex items-center justify-between gap-2 cursor-pointer border ${
                            activeSessionId === session.id
                              ? 'bg-surface-highlight/50/90 text-primary border-surface-highlight font-semibold'
                              : 'hover:bg-surface-highlight/60/50 text-secondary border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                            <span className="text-xs truncate">{session.title}</span>
                          </div>
                          <button
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-secondary/70 hover:text-red-400 rounded transition shrink-0"
                            title="Delete chat"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Yesterday */}
                  {groupedSessions.yesterday.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-secondary/70 px-2 block">Yesterday</span>
                      {groupedSessions.yesterday.map(session => (
                        <div
                          key={session.id}
                          onClick={() => handleSelectSession(session)}
                          className={`group w-full text-left p-2.5 rounded-xl transition flex items-center justify-between gap-2 cursor-pointer border ${
                            activeSessionId === session.id
                              ? 'bg-surface-highlight/50/90 text-primary border-surface-highlight font-semibold'
                              : 'hover:bg-surface-highlight/60/50 text-secondary border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                            <span className="text-xs truncate">{session.title}</span>
                          </div>
                          <button
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-secondary/70 hover:text-red-400 rounded transition shrink-0"
                            title="Delete chat"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Previous 7 Days */}
                  {groupedSessions.previousWeek.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-secondary/70 px-2 block">Previous 7 Days</span>
                      {groupedSessions.previousWeek.map(session => (
                        <div
                          key={session.id}
                          onClick={() => handleSelectSession(session)}
                          className={`group w-full text-left p-2.5 rounded-xl transition flex items-center justify-between gap-2 cursor-pointer border ${
                            activeSessionId === session.id
                              ? 'bg-surface-highlight/50/90 text-primary border-surface-highlight font-semibold'
                              : 'hover:bg-surface-highlight/60/50 text-secondary border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                            <span className="text-xs truncate">{session.title}</span>
                          </div>
                          <button
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-secondary/70 hover:text-red-400 rounded transition shrink-0"
                            title="Delete chat"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Older */}
                  {groupedSessions.older.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-secondary/70 px-2 block">Older</span>
                      {groupedSessions.older.map(session => (
                        <div
                          key={session.id}
                          onClick={() => handleSelectSession(session)}
                          className={`group w-full text-left p-2.5 rounded-xl transition flex items-center justify-between gap-2 cursor-pointer border ${
                            activeSessionId === session.id
                              ? 'bg-surface-highlight/50/90 text-primary border-surface-highlight font-semibold'
                              : 'hover:bg-surface-highlight/60/50 text-secondary border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                            <span className="text-xs truncate">{session.title}</span>
                          </div>
                          <button
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-secondary/70 hover:text-red-400 rounded transition shrink-0"
                            title="Delete chat"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar Footer: Model and voice info */}
            <div className="p-3 border-t border-surface-highlight bg-surface-lowest text-[11px] text-secondary/70 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono">
                <AudioLines className="w-3 h-3 text-accent" />
                Edge TTS ({selectedEdgeVoice.name.split(' ')[1] || 'Aria'})
              </span>
              <span className="font-mono opacity-60">v1.2</span>
            </div>
          </aside>

          {/* MAIN CHAT AREA */}
          <div className="flex-1 flex flex-col h-full bg-surface-lowest overflow-hidden relative">
            {/* Header */}
            <header className="px-4 sm:px-6 py-3.5 border-b border-surface-highlight flex items-center justify-between bg-surface shrink-0 z-30">
              <div className="flex items-center gap-3">
                {/* Sidebar Toggle Button */}
                <button
                  onClick={() => setIsSidebarOpen(prev => !prev)}
                  className={`p-2 rounded-xl border transition ${
                    isSidebarOpen 
                      ? 'bg-surface-highlight/50 border-surface-highlight text-accent' 
                      : 'bg-surface border-surface-highlight text-secondary hover:text-primary hover:border-accent/40'
                  }`}
                  title="Toggle Chat History & Sidebar"
                >
                  <PanelLeft className="w-4 h-4" />
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display font-bold text-base sm:text-lg text-primary leading-tight">AI Companion</h2>
                    <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-accent/10 text-accent border border-accent/20">
                      <Brain className="w-2.5 h-2.5" />
                      RAG Memory Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Controls: Edge TTS Voice Picker, Model, Close */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Edge TTS Voice Selector */}
                <div className="relative hidden sm:block">
                  <button
                    onClick={() => setIsVoiceDropdownOpen(prev => !prev)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-highlight/60 text-secondary text-xs font-mono transition border border-surface-highlight"
                    title="Select Microsoft Edge TTS Voice"
                  >
                    <AudioLines className="w-3.5 h-3.5 text-accent" />
                    <span>{selectedEdgeVoice.name.replace('Microsoft ', '')}</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>

                  {isVoiceDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-surface rounded-2xl shadow-xl border border-surface-highlight p-1.5 z-50">
                      <div className="text-[10px] font-mono font-bold text-secondary/70 px-2.5 py-1 uppercase tracking-wider">
                        Microsoft Edge TTS Voices
                      </div>
                      {EDGE_VOICES.map(v => (
                        <button
                          key={v.id}
                          onClick={() => {
                            setSelectedEdgeVoice(v);
                            edgeTts.setVoice(v.id);
                            setIsVoiceDropdownOpen(false);
                            showToast(`Voice set to ${v.name}`);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl transition text-xs flex flex-col ${
                            selectedEdgeVoice.id === v.id
                              ? 'bg-accent/20 text-accent font-semibold'
                              : 'hover:bg-surface-highlight/60 text-primary'
                          }`}
                        >
                          <span className="font-semibold">{v.name}</span>
                          <span className="text-[10px] text-secondary/70">{v.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Model Selector */}
                <div className="relative">
                  <button
                    onClick={() => setIsModelDropdownOpen(prev => !prev)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-highlight/50 hover:bg-surface-highlight text-primary text-xs font-semibold transition border border-surface-highlight"
                  >
                    <Cpu className="w-3.5 h-3.5 text-accent" />
                    <span className="hidden sm:inline">{currentModelName}</span>
                    <span className="sm:hidden">{currentModelName}</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>

                  {isModelDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-2xl shadow-xl border border-surface-highlight p-1.5 z-50">
                      <div className="text-[10px] font-mono font-bold text-secondary/70 px-2.5 py-1 uppercase tracking-wider">Select Model</div>
                      {TIERS.map(m => (
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
                              : 'hover:bg-surface-highlight/60 text-primary'
                          }`}
                        >
                          <span className="font-semibold">{m.name}</span>
                          <span className="text-[10px] text-secondary/70 font-light">{m.tag} · {m.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Close Button */}
                <button
                  onClick={() => {
                    edgeTts.stop();
                    onClose();
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-highlight/60 active:scale-95 transition"
                  title="Close AI Companion"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Edge TTS Active Audio Banner */}
            <AnimatePresence>
              {isSpeakingAudio && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-accent/10 border-b border-accent/20 px-4 py-2 flex items-center justify-between text-xs text-accent z-20 shrink-0"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="flex items-center gap-1 text-accent">
                      <span className="w-1 h-3 bg-accent animate-pulse" />
                      <span className="w-1 h-4 bg-accent animate-pulse delay-75" />
                      <span className="w-1 h-2 bg-accent animate-pulse delay-150" />
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-accent">Microsoft Edge TTS ({selectedEdgeVoice.name.split(' ')[1] || 'Aria'})</span>
                    <span className="text-secondary/70 truncate hidden sm:inline">• "{activeTtsSnippet}"</span>
                  </div>
                  <button
                    onClick={() => edgeTts.stop()}
                    className="px-2.5 py-1 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent text-xs font-medium transition flex items-center gap-1 shrink-0"
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Stop Audio</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* NO DEFAULT GREETINGS: Clean, elegant empty state when there are 0 messages */}
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 max-w-lg mx-auto my-auto space-y-6">
                  <div className="w-14 h-14 rounded-3xl bg-surface border border-surface-highlight flex items-center justify-center text-accent shadow-xl">
                    <Sparkles className="w-7 h-7" />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-primary">
                      {userName ? `What's on your mind, ${userName.trim()}?` : "What's on your mind today?"}
                    </h3>
                    <p className="text-xs sm:text-sm text-secondary/70 leading-relaxed">
                      I have deep awareness of your memories and core knowledge. Start typing or tap a prompt below to begin.
                    </p>
                  </div>

                  {/* Conversation Starter Chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-2">
                    {[
                      { label: "Reflect on this week's progress", prompt: "Can you help me reflect on this week's highlights and emotional patterns?" },
                      { label: "Help me organize priorities", prompt: "Can you review my recent thoughts and help me organize my top priorities?" },
                      { label: "Recall a fond memory", prompt: "What are some of the happiest memories I've written about recently?" },
                      { label: "Brainstorm creative goals", prompt: "Let's brainstorm a few creative goals based on what I've been feeling." }
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(chip.prompt)}
                        className="p-3 text-left rounded-2xl bg-surface/90 hover:bg-surface-highlight/60 border border-surface-highlight/80 hover:border-accent/40 transition text-xs text-secondary hover:text-primary flex items-start gap-2 group"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                        <span className="leading-snug">{chip.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Render Messages */}
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-4xl mx-auto w-full group`}
                >
                  <div className={`flex gap-3 max-w-[90%] sm:max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                      msg.sender === 'user' 
                        ? 'bg-accent text-accent-fg' 
                        : 'bg-surface-highlight/50 text-secondary border border-surface-highlight'
                    }`}>
                      {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div className="flex flex-col gap-1 w-full">
                      <div className={`p-4 rounded-3xl text-sm leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-accent text-accent-fg rounded-tr-xs'
                          : 'bg-surface text-primary border border-surface-highlight rounded-tl-xs shadow-md'
                      }`}>
                        <div className="whitespace-pre-wrap">{msg.text}</div>

                        {/* Referenced Memories Pill */}
                        {msg.sender === 'bot' && msg.referencedMemories && msg.referencedMemories.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-surface-highlight/80">
                            <button
                              type="button"
                              onClick={() => setExpandedMemoryMsgId(expandedMemoryMsgId === msg.id ? null : msg.id)}
                              className="text-[11px] font-mono text-accent hover:underline flex items-center gap-1.5"
                            >
                              <Brain className="w-3 h-3" />
                              <span>{msg.referencedMemories.length} memories referenced in context</span>
                              <ChevronDown className={`w-3 h-3 transition-transform ${expandedMemoryMsgId === msg.id ? 'rotate-180' : ''}`} />
                            </button>

                            {expandedMemoryMsgId === msg.id && (
                              <div className="mt-2 space-y-1.5 bg-surface/90 p-2.5 rounded-xl border border-surface-highlight text-xs">
                                {msg.referencedMemories.map((ref, idx) => (
                                  <div key={idx} className="space-y-0.5">
                                    <div className="flex items-center justify-between text-[10px] font-mono text-secondary/70">
                                      <span className="font-bold text-secondary truncate">{ref.title}</span>
                                      <span>{ref.date}</span>
                                    </div>
                                    <p className="text-[11px] text-secondary/70 italic leading-snug">{ref.snippet}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action buttons for extracted insights */}
                        {msg.sender === 'bot' && (msg.extractedTasks?.length || msg.extractedJournal || msg.extractedMood) && (
                          <div className="mt-3 pt-2 border-t border-surface-highlight flex flex-wrap gap-2 items-center justify-between">
                            <span className="text-[11px] font-mono text-secondary/70">
                              {msg.extractedTasks?.length ? `${msg.extractedTasks.length} task(s)` : ''}
                              {msg.extractedMood ? ` • Mood: ${msg.extractedMood}` : ''}
                            </span>

                            <button
                              onClick={() => handleSaveToZournel(msg)}
                              disabled={addedIds[msg.id]}
                              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition ${
                                addedIds[msg.id]
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-surface-highlight/50 hover:bg-surface-highlight text-primary border border-surface-highlight'
                              }`}
                            >
                              {addedIds[msg.id] ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <PlusCircle className="w-3 h-3 text-accent" />}
                              <span>{addedIds[msg.id] ? 'Saved to Zournel' : 'Save to Zournel'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Bot Message Action Toolbar */}
                      {msg.sender === 'bot' && (
                        <div className="flex items-center gap-1 mt-1 text-secondary/70 text-xs">
                          {/* Microsoft Edge TTS Speak Button */}
                          <button
                            onClick={() => handleSpeakWithEdgeTts(msg.text)}
                            className="p-1.5 hover:text-accent hover:bg-surface-highlight/60 rounded-lg transition"
                            title={`Read aloud with Microsoft Edge TTS (${selectedEdgeVoice.name.split(' ')[1] || 'Aria'})`}
                          >
                            <Volume2 className="w-3.5 h-3.5 text-accent" />
                          </button>

                          {/* Copy */}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(msg.text);
                              setCopiedId(msg.id);
                              setTimeout(() => setCopiedId(null), 2000);
                              showToast("Copied to clipboard");
                            }}
                            className="p-1.5 hover:text-primary hover:bg-surface-highlight/60 rounded-lg transition"
                            title="Copy text"
                          >
                            {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          {/* Thumbs Up */}
                          <button
                            onClick={() => {
                              setFeedbackState(prev => ({ ...prev, [msg.id]: 'up' }));
                              showToast("Thanks for the positive feedback!");
                            }}
                            className={`p-1.5 hover:bg-surface-highlight/60 rounded-lg transition ${feedbackState[msg.id] === 'up' ? 'text-accent' : 'hover:text-primary'}`}
                            title="Helpful response"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>

                          {/* Thumbs Down */}
                          <button
                            onClick={() => {
                              setFeedbackState(prev => ({ ...prev, [msg.id]: 'down' }));
                              showToast("Feedback recorded. We'll improve future answers.");
                            }}
                            className={`p-1.5 hover:bg-surface-highlight/60 rounded-lg transition ${feedbackState[msg.id] === 'down' ? 'text-red-400' : 'hover:text-primary'}`}
                            title="Not helpful"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Share */}
                          <button
                            onClick={() => {
                              if (navigator.share) {
                                navigator.share({ title: 'AI Reflection', text: msg.text }).catch(() => {});
                              } else {
                                navigator.clipboard.writeText(msg.text);
                                showToast("Share link copied");
                              }
                            }}
                            className="p-1.5 hover:text-primary hover:bg-surface-highlight/60 rounded-lg transition"
                            title="Share reflection"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Regenerate */}
                          <button
                            onClick={handleRegenerate}
                            className="p-1.5 hover:text-primary hover:bg-surface-highlight/60 rounded-lg transition"
                            title="Regenerate response"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-3 max-w-4xl mx-auto w-full items-start">
                  <div className="w-8 h-8 rounded-full bg-surface-highlight/50 border border-surface-highlight flex items-center justify-center text-secondary shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-3xl bg-surface border border-surface-highlight rounded-tl-xs text-xs text-secondary/70 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                    <span>{isThinkEnabled ? 'Reasoning across memories and core context...' : 'Thinking...'}</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 sm:p-5 border-t border-surface-highlight bg-surface-lowest shrink-0 flex justify-center">
              <div className="w-full max-w-3xl relative">
                {/* Attachment Menu Popup */}
                {isAttachOpen && (
                  <div className="absolute bottom-full mb-3 left-0 w-64 bg-surface rounded-2xl shadow-2xl border border-surface-highlight p-2 z-50">
                    <div className="text-[10px] font-mono font-bold text-secondary/70 px-2 py-1 uppercase tracking-wider">Attach Memory Context</div>
                    <button
                      onClick={() => handleAttachOption('recent')}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs hover:bg-surface-highlight/60 text-primary transition flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      <span>Reference Recent Journal</span>
                    </button>
                    <button
                      onClick={() => handleAttachOption('summary')}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs hover:bg-surface-highlight/60 text-primary transition flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      <span>Summarize Recent Week</span>
                    </button>
                    <button
                      onClick={() => handleAttachOption('tasks')}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs hover:bg-surface-highlight/60 text-primary transition flex items-center gap-2"
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
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-surface rounded-3xl sm:rounded-full p-2.5 sm:px-4 sm:py-3 border border-surface-highlight focus-within:border-accent transition shadow-xl"
                >
                  <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-grow">
                      <button
                        type="button"
                        onClick={() => setIsAttachOpen(prev => !prev)}
                        className="w-9 h-9 rounded-full bg-surface-highlight/50 hover:bg-surface-highlight text-secondary flex items-center justify-center transition shrink-0"
                        title="Attach memories or prompt presets"
                      >
                        <Plus className="w-4 h-4" />
                      </button>

                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={userName ? `Ask anything, ${userName.trim()}...` : "Ask anything"}
                        className="flex-grow bg-transparent px-2 sm:px-3 py-1 text-sm sm:text-base text-primary placeholder:text-secondary/70 outline-none"
                        disabled={isTyping}
                      />
                    </div>

                    {/* Mobile Send Button */}
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

                  <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-surface-highlight">
                    <button
                      type="button"
                      onClick={() => {
                        setIsThinkEnabled(prev => !prev);
                        showToast(!isThinkEnabled ? "Deep reasoning Think mode enabled" : "Think mode disabled");
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition border ${
                        isThinkEnabled 
                          ? 'bg-surface-highlight/50 border-surface-highlight text-accent' 
                          : 'bg-surface border-surface-highlight text-secondary/70'
                      }`}
                      title="Toggle Think mode"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Think</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleVoiceInput}
                      className={`p-2 transition rounded-full hover:bg-surface-highlight/60 ${isListening ? 'text-red-400 animate-pulse bg-surface-highlight/50' : 'text-secondary/70 hover:text-primary'}`}
                      title="Voice input dictation"
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    {/* Microsoft Edge TTS Audio Speaker Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const lastBotMsg = messages.filter(m => m.sender === 'bot').pop();
                        if (lastBotMsg) {
                          handleSpeakWithEdgeTts(lastBotMsg.text);
                        } else {
                          showToast("No AI response to read aloud yet.");
                        }
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition shrink-0 shadow-sm ${
                        isSpeakingAudio 
                          ? 'bg-accent text-accent-fg animate-pulse' 
                          : 'bg-accent/15 hover:bg-accent/25 text-accent'
                      }`}
                      title={`Read last response with Microsoft Edge TTS (${selectedEdgeVoice.name.split(' ')[1] || 'Aria'})`}
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
          </div>

          {/* AI MEMORIES MANAGEMENT MODAL */}
          <AiMemoriesModal
            isOpen={isMemoriesModalOpen}
            onClose={() => setIsMemoriesModalOpen(false)}
            journalEntries={journalEntries}
            onMemoriesUpdated={() => {
              setMemoriesCount(getStoredMemories().length);
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
