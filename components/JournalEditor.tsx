import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Sparkles, Upload, Wand2, RefreshCw, Type, Save, Image as ImageIcon } from 'lucide-react';
import { editJournalText, generateCoverImage } from '../services/geminiService';

interface JournalEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string, image: string | undefined) => void;
  initialContent?: string;
  initialImage?: string;
}

// Curated list of high-quality aesthetic images
const AESTHETIC_IMAGES = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000', // Sea
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=2000', // Mountains
  'https://images.unsplash.com/photo-1499750310159-5b5f0969206b?auto=format&fit=crop&q=80&w=2000', // Paper
  'https://images.unsplash.com/photo-1518176258769-f227c798150e?auto=format&fit=crop&q=80&w=2000', // Minimal
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=2000', // Nature
  'https://images.unsplash.com/photo-1506260408121-e353d10b87c7?auto=format&fit=crop&q=80&w=2000', // Abstract
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&q=80&w=2000', // Alp
  'https://images.unsplash.com/photo-1485470733090-0aae1788d5af?auto=format&fit=crop&q=80&w=2000', // Pastel
];

const getRandomImage = () => {
  return AESTHETIC_IMAGES[Math.floor(Math.random() * AESTHETIC_IMAGES.length)];
};

export const JournalEditor: React.FC<JournalEditorProps> = ({ isOpen, onClose, onSave, initialContent = '', initialImage = '' }) => {
  const [content, setContent] = useState(initialContent);
  const [image, setImage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      if (initialImage) {
        setImage(initialImage);
      } else {
         // Always provide a starting image for better aesthetics, even if editing an old entry without one
         setImage(getRandomImage());
      }
    }
  }, [isOpen, initialContent, initialImage]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        // Reset input so selecting the same file triggers onChange again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIEdit = async (type: 'IMPROVE' | 'REPHRASE' | 'SUMMARIZE') => {
    if (!content.trim()) return;
    setIsProcessing(true);
    const newText = await editJournalText(content, type);
    setContent(newText);
    setIsProcessing(false);
  };

  const handleGenerateImage = async () => {
    setIsProcessing(true);
    const prompt = content.slice(0, 150) || "Peaceful abstract landscape";
    
    try {
      const generated = await generateCoverImage(prompt);
      if (generated) {
        setImage(generated);
      } else {
        // Fallback: Pick a random new image from the curated list
        let nextImage = getRandomImage();
        // Try to find a different one
        let attempts = 0;
        while(nextImage === image && attempts < 5) { 
          nextImage = getRandomImage(); 
          attempts++;
        }
        setImage(nextImage);
      }
    } catch (error) {
      console.error("Generation failed", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    if (content.trim()) {
      onSave(content, image);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col animate-scale-in origin-bottom">
      
      {/* Immersive Header */}
      <div className="relative h-[40vh] w-full bg-secondary overflow-hidden group">
        {image ? (
          <img 
            src={image} 
            alt="Journal Cover" 
            className="w-full h-full object-cover transition-transform duration-[3s] ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-white/20" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-bg pointer-events-none"></div>

        {/* Top Bar */}
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
            <button 
            onClick={onClose} 
            className="w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-xl rounded-full text-white hover:bg-white/20 transition-all border border-white/20 shadow-lg"
            >
            <ArrowLeft className="w-6 h-6" />
            </button>

            <button 
            onClick={handleSave}
            className="px-6 py-3 bg-accent text-accent-fg rounded-full text-sm font-semibold hover:bg-accent/90 transition-all flex items-center gap-2 shadow-lg shadow-accent/30"
            >
            <Save className="w-4 h-4" />
            <span>Save</span>
            </button>
        </div>

        {/* Floating Action Tools for Image */}
        <div className="absolute bottom-6 right-6 flex gap-3 z-10">
            <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-4 bg-white/10 backdrop-blur-xl rounded-2xl text-white hover:bg-white/20 transition-all border border-white/20 shadow-lg group/btn"
            title="Upload Image"
            >
            <Upload className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
            </button>
            <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileUpload}
            />
            
            <button 
            onClick={handleGenerateImage}
            disabled={isProcessing}
            className={`p-4 bg-accent/80 backdrop-blur-xl rounded-2xl text-accent-fg hover:bg-accent transition-all border border-white/20 shadow-lg ${isProcessing ? 'animate-pulse' : 'hover:scale-105'}`}
            title="AI Generate Cover"
            >
            {isProcessing ? <Sparkles className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            </button>
        </div>
      </div>

      {/* Content Sheet */}
      <div className="flex-1 relative -mt-10 bg-bg rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden">
        
        {/* Suggestion Chips */}
        <div className="pt-8 px-6 pb-2 overflow-x-auto no-scrollbar flex gap-3">
           <button 
             onClick={() => handleAIEdit('IMPROVE')}
             disabled={isProcessing}
             className="flex items-center gap-2 px-5 py-2.5 bg-surface hover:bg-accent hover:text-accent-fg text-secondary rounded-xl text-sm font-medium transition-all whitespace-nowrap border border-transparent hover:shadow-md"
           >
             <Wand2 className="w-4 h-4" />
             Improve
           </button>
           <button 
             onClick={() => handleAIEdit('REPHRASE')}
             disabled={isProcessing}
             className="flex items-center gap-2 px-5 py-2.5 bg-surface hover:bg-emerald-600 hover:text-white text-secondary rounded-xl text-sm font-medium transition-all whitespace-nowrap border border-transparent hover:shadow-md"
           >
             <RefreshCw className="w-4 h-4" />
             Rephrase
           </button>
           <button 
             onClick={() => handleAIEdit('SUMMARIZE')}
             disabled={isProcessing}
             className="flex items-center gap-2 px-5 py-2.5 bg-surface hover:bg-amber-600 hover:text-white text-secondary rounded-xl text-sm font-medium transition-all whitespace-nowrap border border-transparent hover:shadow-md"
           >
             <Type className="w-4 h-4" />
             Summarize
           </button>
        </div>

        {/* Text Area */}
        <div className="flex-1 px-8 py-6 overflow-y-auto">
            <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing..."
            className="w-full h-full resize-none outline-none text-xl leading-8 font-serif text-primary placeholder:text-secondary/40 bg-transparent selection:bg-accent-dim"
            />
        </div>

        <div className="px-8 py-4 text-right text-xs text-secondary font-medium tracking-wide opacity-50 border-t border-surface">
          {content.length} characters
        </div>
      </div>
    </div>
  );
};
