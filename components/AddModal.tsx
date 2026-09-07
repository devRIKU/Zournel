import React, { useState } from 'react';
import { Sparkles, Loader2, ArrowRight } from './Icons';
import { processUserInput } from '../services/geminiService';
import { triggerHaptic } from '../utils/uiSprings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent onClose={onClose} className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-accent/15 text-accent">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <DialogTitle>AI Brain Dump</DialogTitle>
            <Badge variant="default" className="text-[10px] uppercase font-mono">
              Smart Parse
            </Badge>
          </div>
          <DialogDescription>
            Pour your unformatted thoughts here. The AI will separate actionable tasks from your personal reflections and detect your mood automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="my-1">
          <Textarea
            autoFocus
            className="w-full h-36 p-3 text-base sm:text-lg leading-relaxed placeholder:text-secondary/50 font-sans"
            placeholder="E.g., I need to email Marcus about the contract, pick up groceries, and I felt so energized after walking by the lake this afternoon..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
          />
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <span className="text-xs text-secondary/70 font-mono hidden sm:inline">
            {input.trim() ? `${input.trim().split(/\s+/).length} words` : 'Awaiting thoughts...'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="default"
              onClick={handleSubmit}
              disabled={isProcessing || !input.trim()}
              className="gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Process Thoughts</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
