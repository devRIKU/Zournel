import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Loader2, ArrowRight } from './Icons';
import { processUserInput } from '../services/geminiService';
import { iosSpring, triggerHaptic } from '../utils/uiSprings';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddData: (tasks: string[], journal: string | null, mood: string | null) => void;
}

export const AddModal: React.FC<AddModalProps> = ({ isOpen, onClose, onAddData }) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    triggerHaptic(12);
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

  const handleClose = () => {
    triggerHaptic(8);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
          onClick={handleClose}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.94, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 25 }}
            transition={iosSpring}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 400) {
                handleClose();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-[2.5rem] w-full max-w-lg shadow-2xl relative p-2 border border-surface-highlight overflow-hidden"
          >
            {/* Gesture Handle Bar */}
            <div className="w-full flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1.5 rounded-full bg-surface-highlight/80" />
            </div>

            {/* Header */}
            <div className="px-6 py-3 flex justify-between items-center">
              <div className="flex items-center gap-2 text-accent font-bold text-lg tracking-tight">
                <Sparkles className="w-6 h-6 animate-pulse" />
                <span>AI Brain Dump</span>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-surface-highlight rounded-full transition-colors text-secondary active:scale-95">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Input Area */}
            <div className="p-6 pt-2">
              <p className="text-secondary text-sm mb-4 leading-relaxed">
                Pour your thoughts here. The AI will separate your tasks from your journal entries automatically.
              </p>
              
              <div className="bg-surface-highlight/50 rounded-[1.5rem] p-2 focus-within:ring-2 focus-within:ring-accent transition">
                <textarea
                  autoFocus
                  className="w-full h-40 p-4 text-primary bg-transparent border-none outline-none resize-none text-lg leading-relaxed placeholder:text-secondary/50 font-sans"
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
                  className={`flex items-center gap-2 px-8 py-4 rounded-[1.5rem] text-accent-fg font-semibold text-sm transition shadow-lg active:scale-[0.96] ${
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
