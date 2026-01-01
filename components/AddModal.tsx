import React, { useState } from 'react';
import { Sparkles, X, Loader2, ArrowRight } from 'lucide-react';
import { processUserInput } from '../services/geminiService';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddData: (tasks: string[], journal: string | null, mood: string | null) => void;
}

export const AddModal: React.FC<AddModalProps> = ({ isOpen, onClose, onAddData }) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setIsProcessing(true);
    
    try {
      const result = await processUserInput(input);
      onAddData(result.tasks, result.journalContent, result.mood);
      setInput('');
      onClose();
    } catch (e) {
      console.error(e);
      onAddData([input], null, null);
      setInput('');
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-bright rounded-[2.5rem] w-full max-w-lg shadow-2xl relative animate-scale-in p-2">
        
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-accent font-bold text-lg tracking-tight">
            <Sparkles className="w-6 h-6" />
            <span>AI Assistant</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors text-secondary">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Input Area */}
        <div className="p-6 pt-2">
          <p className="text-secondary text-sm mb-4">
            Pour your thoughts here. The AI will separate your tasks from your journal entries automatically.
          </p>
          
          <div className="bg-surface-container rounded-[1.5rem] p-2 focus-within:ring-2 focus-within:ring-accent transition-all">
            <textarea
              autoFocus
              className="w-full h-40 p-4 text-primary bg-transparent border-none outline-none resize-none text-lg leading-relaxed placeholder:text-secondary/50"
              placeholder="E.g., I need to buy milk and I felt really energetic after my morning run..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isProcessing}
            />
          </div>
          
          <div className="flex justify-end items-center mt-6">
            <button
              onClick={handleSubmit}
              disabled={isProcessing || !input.trim()}
              className={`flex items-center gap-2 px-8 py-4 rounded-[1.5rem] text-white font-semibold text-sm transition-all shadow-lg hover:shadow-xl active:scale-95 ${
                isProcessing || !input.trim() 
                  ? 'bg-secondary/20 text-secondary cursor-not-allowed shadow-none' 
                  : 'bg-accent hover:bg-accent/90'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Analyze & Sort</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
