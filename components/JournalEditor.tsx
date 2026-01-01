import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Sparkles, Wand2, RefreshCw, Save, ImageIcon, Bold, Italic, List, Heading1, Heading2, Link2, X, Plus, Paperclip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { editJournalText, generateCoverImage } from '../services/geminiService';

interface JournalEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string, image: string | undefined) => void;
  initialContent?: string;
  initialImage?: string;
  selectedModel?: string;
}

const AESTHETIC_COLLECTION = [
  'https://images.unsplash.com/photo-1499750310159-5b5f0969206b?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1200',
];

export const JournalEditor: React.FC<JournalEditorProps> = ({ isOpen, onClose, onSave, initialContent = '', initialImage = '', selectedModel }) => {
  const [content, setContent] = useState(initialContent);
  const [image, setImage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [imgUrlInput, setImgUrlInput] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const localImageInputRef = useRef<HTMLInputElement>(null);
  const localCoverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      setImage(initialImage || AESTHETIC_COLLECTION[0]);
    }
  }, [isOpen, initialContent, initialImage]);

  if (!isOpen) return null;

  const insertMarkdown = (before: string, after: string = '') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selection = text.substring(start, end);
    const replacement = before + selection + after;
    setContent(text.substring(0, start) + replacement + text.substring(end));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    }, 10);
  };

  const handleAddImageUrl = (url: string) => {
    if (url.trim()) {
      insertMarkdown(`\n![Image](${url.trim()})\n`);
      setImgUrlInput('');
      setShowImagePrompt(false);
    }
  };

  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      handleAddImageUrl(url);
    }
  };

  const handleLocalCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImage(url);
    }
  };

  const handleAIEdit = async (type: 'IMPROVE' | 'REPHRASE' | 'SUMMARIZE') => {
    if (!content.trim()) return;
    setIsProcessing(true);
    const newText = await editJournalText(content, type, selectedModel);
    setContent(newText);
    setIsProcessing(false);
  };

  const handleGenerateCover = async () => {
    setIsProcessing(true);
    try {
      const generated = await generateCoverImage(content.slice(0, 150));
      if (generated) setImage(generated);
    } catch (e) {} finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-bg flex flex-col animate-fade-in overflow-hidden">
      {/* Premium Header - Persistent Cover */}
      <div className="relative h-[32vh] shrink-0 w-full overflow-hidden group">
        {image && (
          <img 
            src={image} 
            className="w-full h-full object-cover transition-transform duration-[30s] scale-105 group-hover:scale-110" 
            alt="cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-bg"></div>
        
        {/* Navigation Overlays - Hides on focus */}
        <div className={`absolute top-0 left-0 w-full p-8 flex justify-between items-center z-50 transition-all duration-700 ${isFocused ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100'}`}>
          <button onClick={onClose} className="w-14 h-14 flex items-center justify-center bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-2xl text-white hover:bg-white/30 transition-all">
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex gap-4">
            <button 
              onClick={() => { if (content.trim()) onSave(content, image); onClose(); }} 
              className="px-8 py-4 bg-accent text-accent-fg rounded-2xl text-sm font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border border-white/20"
            >
              <Save className="w-5 h-5" />
              <span>Save Entry</span>
            </button>
          </div>
        </div>

        {/* Cover Controls - Hides on focus */}
        <div className={`absolute bottom-8 right-12 flex gap-4 transition-all duration-700 ${isFocused ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex bg-white/10 backdrop-blur-2xl p-2 rounded-2xl border border-white/20 shadow-2xl items-center">
            {AESTHETIC_COLLECTION.slice(0, 3).map((url, i) => (
              <button 
                key={i} 
                onClick={() => setImage(url)}
                className={`w-8 h-8 rounded-lg overflow-hidden border-2 m-1 transition-all ${image === url ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
              >
                <img src={url} className="w-full h-full object-cover" />
              </button>
            ))}
            <button 
              onClick={() => localCoverInputRef.current?.click()}
              className="w-8 h-8 rounded-lg border-2 border-white/20 m-1 flex items-center justify-center text-white hover:bg-white/10 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
            <input type="file" ref={localCoverInputRef} className="hidden" accept="image/*" onChange={handleLocalCoverUpload} />
          </div>
          <button 
            onClick={handleGenerateCover} 
            disabled={isProcessing}
            className={`flex items-center gap-2 px-6 py-4 bg-white/20 backdrop-blur-2xl text-white border border-white/20 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/30 transition-all ${isProcessing ? 'animate-pulse' : ''}`}
          >
            <Sparkles className="w-4 h-4" />
            AI Gen
          </button>
        </div>
      </div>

      {/* Main Content & Auto-hiding Toolbar */}
      <div className="flex-1 bg-bg flex flex-col overflow-hidden relative z-20 -mt-10 rounded-t-[3.5rem] shadow-[-10px_-10px_60px_-10px_rgba(0,0,0,0.1)]">
        
        {/* Contextual Toolbar - Hides when typing to maximize focus */}
        <div className={`absolute top-10 left-1/2 -translate-x-1/2 z-40 transition-all duration-700 ease-[cubic-bezier(0.2,0,0,1)] ${isFocused ? 'opacity-0 -translate-y-12 scale-90 pointer-events-none' : 'opacity-100 translate-y-0 scale-100'}`}>
          <div className="flex items-center gap-3 p-2 bg-surface/90 backdrop-blur-3xl rounded-[2.5rem] border border-surface-highlight shadow-2xl">
            <div className="flex items-center gap-1 border-r border-surface-highlight pr-2">
              <button onClick={() => insertMarkdown('**', '**')} className="p-3 hover:bg-surface-highlight rounded-xl text-secondary hover:text-primary transition-colors"><Bold className="w-5 h-5"/></button>
              <button onClick={() => insertMarkdown('*', '*')} className="p-3 hover:bg-surface-highlight rounded-xl text-secondary hover:text-primary transition-colors"><Italic className="w-5 h-5"/></button>
              <div className="w-px h-6 bg-surface-highlight mx-1"></div>
              <button onClick={() => insertMarkdown('# ')} className="p-3 hover:bg-surface-highlight rounded-xl text-secondary hover:text-primary transition-colors"><Heading1 className="w-5 h-5"/></button>
              <button onClick={() => insertMarkdown('## ')} className="p-3 hover:bg-surface-highlight rounded-xl text-secondary hover:text-primary transition-colors"><Heading2 className="w-5 h-5"/></button>
              <button onClick={() => insertMarkdown('- ')} className="p-3 hover:bg-surface-highlight rounded-xl text-secondary hover:text-primary transition-colors"><List className="w-5 h-5"/></button>
              <div className="w-px h-6 bg-surface-highlight mx-1"></div>
              <button onClick={() => setShowImagePrompt(true)} className="p-3 hover:bg-surface-highlight rounded-xl text-secondary hover:text-primary transition-colors"><ImageIcon className="w-5 h-5"/></button>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => handleAIEdit('IMPROVE')} disabled={isProcessing} className="p-3 hover:bg-accent/10 hover:text-accent rounded-xl text-secondary transition-all" title="Improve Flow"><Wand2 className="w-5 h-5"/></button>
              <button onClick={() => handleAIEdit('REPHRASE')} disabled={isProcessing} className="p-3 hover:bg-accent/10 hover:text-accent rounded-xl text-secondary transition-all" title="Rephrase Creative"><RefreshCw className="w-5 h-5"/></button>
            </div>
          </div>
        </div>

        {/* Writing Surface - Clean, Minimalist Layout */}
        <div className="flex-1 overflow-y-auto no-scrollbar pt-32 pb-64 px-10">
          <div className="max-w-4xl mx-auto relative">
            <textarea 
              ref={textareaRef}
              value={content} 
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => setContent(e.target.value)} 
              className="w-full min-h-[30vh] resize-none outline-none text-2xl leading-[1.8] font-sans text-primary bg-transparent transition-all placeholder:text-secondary/10 editor-layer"
              spellCheck={false}
              placeholder="Start your story..."
              autoFocus
            />

            {/* Robust Markdown Visualizer - Synchronized with Editor */}
            <div className={`mt-24 border-t border-surface-highlight pt-20 animate-fade-in prose prose-2xl transition-all duration-1000 ${isFocused ? 'opacity-10 scale-[0.98]' : 'opacity-100 scale-100'}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content || '*Words will bloom here...*'}
                </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Image Modal */}
      {showImagePrompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-xl animate-fade-in p-6">
          <div className="bg-surface rounded-[3rem] w-full max-w-md p-10 shadow-2xl border border-white/10 animate-scale-in">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-display font-bold text-primary">Add Visual</h3>
              <button onClick={() => setShowImagePrompt(false)} className="p-3 hover:bg-surface-highlight rounded-2xl transition-all"><X className="w-6 h-6"/></button>
            </div>
            
            <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">Upload Locally</label>
                <button 
                  onClick={() => localImageInputRef.current?.click()}
                  className="w-full py-6 bg-surface-highlight hover:bg-accent hover:text-accent-fg border-2 border-dashed border-surface-highlight rounded-3xl flex flex-col items-center justify-center gap-3 transition-all group"
                >
                  <Paperclip className="w-8 h-8 text-secondary group-hover:text-accent-fg" />
                  <span className="text-sm font-bold">Pick a File</span>
                </button>
                <input type="file" ref={localImageInputRef} className="hidden" accept="image/*" onChange={handleLocalImageUpload} />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-highlight"></div></div>
                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest"><span className="bg-surface px-4 text-secondary">Or Paste URL</span></div>
              </div>

              <div className="flex gap-3">
                <input 
                  autoFocus
                  type="text" 
                  value={imgUrlInput}
                  onChange={(e) => setImgUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddImageUrl(imgUrlInput)}
                  className="flex-1 px-6 py-5 bg-surface-highlight border border-transparent focus:border-accent rounded-3xl outline-none text-primary transition-all font-sans text-sm"
                  placeholder="https://images.unsplash.com/..."
                />
                <button 
                  onClick={() => handleAddImageUrl(imgUrlInput)}
                  className="p-5 bg-accent text-accent-fg rounded-3xl hover:scale-105 active:scale-95 transition-all shadow-lg"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <p className="mt-8 text-[11px] text-secondary text-center italic opacity-60">Actual image support enabled. Fast loading, no data bloat.</p>
          </div>
        </div>
      )}
    </div>
  );
};