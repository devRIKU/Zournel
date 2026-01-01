
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Sparkles, Upload, Wand2, RefreshCw, Type, Save, Image as ImageIcon } from 'lucide-react';
import { editJournalText, generateCoverImage } from '../services/geminiService';

interface JournalEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string, image: string | undefined) => void;
  initialContent?: string;
  initialImage?: string;
  selectedModel?: string;
}

const AESTHETIC_IMAGES = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=2000',
  'https://images.unsplash.com/photo-1499750310159-5b5f0969206b?auto=format&fit=crop&q=80&w=2000',
  'https://images.unsplash.com/photo-1518176258769-f227c798150e?auto=format&fit=crop&q=80&w=2000',
];

const getRandomImage = () => AESTHETIC_IMAGES[Math.floor(Math.random() * AESTHETIC_IMAGES.length)];

export const JournalEditor: React.FC<JournalEditorProps> = ({ isOpen, onClose, onSave, initialContent = '', initialImage = '', selectedModel }) => {
  const [content, setContent] = useState(initialContent);
  const [image, setImage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      setImage(initialImage || getRandomImage());
    }
  }, [isOpen, initialContent, initialImage]);

  if (!isOpen) return null;

  const handleAIEdit = async (type: 'IMPROVE' | 'REPHRASE' | 'SUMMARIZE') => {
    if (!content.trim()) return;
    setIsProcessing(true);
    const newText = await editJournalText(content, type, selectedModel);
    setContent(newText);
    setIsProcessing(false);
  };

  const handleGenerateImage = async () => {
    setIsProcessing(true);
    try {
      const generated = await generateCoverImage(content.slice(0, 150));
      if (generated) setImage(generated);
      else setImage(getRandomImage());
    } catch (e) {
      setImage(getRandomImage());
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col animate-scale-in origin-bottom">
      <div className="relative h-[40vh] w-full bg-secondary overflow-hidden group">
        {image && <img src={image} className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-105" alt="cover"/>}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-bg pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
            <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-xl rounded-full text-white hover:bg-white/20 transition-all border border-white/20 shadow-lg">
                <ArrowLeft className="w-6 h-6" />
            </button>
            <button onClick={() => { if (content.trim()) onSave(content, image); onClose(); }} className="px-6 py-3 bg-accent text-accent-fg rounded-full text-sm font-semibold hover:bg-accent/90 transition-all flex items-center gap-2 shadow-lg">
                <Save className="w-4 h-4" />
                <span>Save</span>
            </button>
        </div>
        <div className="absolute bottom-6 right-6 flex gap-3 z-10">
            <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white/10 backdrop-blur-xl rounded-2xl text-white hover:bg-white/20 transition-all border border-white/20 shadow-lg">
                <Upload className="w-5 h-5" />
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { const r = new FileReader(); r.onloadend = () => setImage(r.result as string); r.readAsDataURL(f); }
            }}/>
            <button onClick={handleGenerateImage} disabled={isProcessing} className={`p-4 bg-accent/80 backdrop-blur-xl rounded-2xl text-accent-fg hover:bg-accent transition-all border border-white/20 shadow-lg ${isProcessing ? 'animate-pulse' : ''}`}>
                <Sparkles className="w-5 h-5" />
            </button>
        </div>
      </div>
      <div className="flex-1 relative -mt-10 bg-bg rounded-t-[3rem] shadow-2xl flex flex-col overflow-hidden">
        <div className="pt-8 px-6 pb-2 overflow-x-auto no-scrollbar flex gap-3">
           <button onClick={() => handleAIEdit('IMPROVE')} disabled={isProcessing} className="chip flex items-center gap-2 px-5 py-2.5 bg-surface hover:bg-accent hover:text-accent-fg text-secondary rounded-xl text-sm transition-all border border-transparent">
             <Wand2 className="w-4 h-4" /> Improve
           </button>
           <button onClick={() => handleAIEdit('REPHRASE')} disabled={isProcessing} className="chip flex items-center gap-2 px-5 py-2.5 bg-surface hover:bg-emerald-600 hover:text-white text-secondary rounded-xl text-sm transition-all border border-transparent">
             <RefreshCw className="w-4 h-4" /> Rephrase
           </button>
           <button onClick={() => handleAIEdit('SUMMARIZE')} disabled={isProcessing} className="chip flex items-center gap-2 px-5 py-2.5 bg-surface hover:bg-amber-600 hover:text-white text-secondary rounded-xl text-sm transition-all border border-transparent">
             <Type className="w-4 h-4" /> Summarize
           </button>
        </div>
        <div className="flex-1 px-8 py-6 overflow-y-auto">
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Start writing..." className="w-full h-full resize-none outline-none text-xl leading-8 font-serif text-primary bg-transparent"/>
        </div>
      </div>
    </div>
  );
};
