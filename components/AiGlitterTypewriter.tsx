import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Wand2 } from './Icons';

interface AiGlitterTypewriterProps {
  text: string;
  speed?: number; // ms per character
  className?: string;
  showGlitterHighlight?: boolean;
  showSparkleBadge?: boolean;
  badgeText?: string;
  onComplete?: () => void;
  asHeading?: boolean;
}

export const AiGlitterTypewriter: React.FC<AiGlitterTypewriterProps> = ({
  text,
  speed = 28,
  className = '',
  showGlitterHighlight = true,
  showSparkleBadge = true,
  badgeText = 'AI Rewritten',
  onComplete,
  asHeading = false,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsDone(false);
    if (!text) return;

    let index = 0;
    const interval = setInterval(() => {
      index++;
      setDisplayedText(text.slice(0, index));
      if (index >= text.length) {
        clearInterval(interval);
        setIsDone(true);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <div className="relative inline-block w-full">
      {/* Optional Sparkle Badge */}
      <AnimatePresence>
        {showSparkleBadge && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mb-1.5 rounded-full bg-accent/15 border border-accent/30 text-[10px] font-bold uppercase tracking-wider text-accent shadow-xs"
          >
            <Sparkles className="w-3 h-3 text-accent animate-spin" style={{ animationDuration: '3s' }} />
            <span>{badgeText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Typewriter Container with Glitter Highlight overlay */}
      <div className={`relative transition-all duration-500 rounded-xl ${!isDone && showGlitterHighlight ? 'ai-glitter-highlight p-1.5' : ''}`}>
        {asHeading ? (
          <h2 className={className}>
            <span className={isDone ? '' : 'ai-glitter-text'}>{displayedText}</span>
            {!isDone && <span className="ai-typewriter-cursor" />}
          </h2>
        ) : (
          <span className={className}>
            <span className={isDone ? '' : 'ai-glitter-text'}>{displayedText}</span>
            {!isDone && <span className="ai-typewriter-cursor" />}
          </span>
        )}

        {/* Floating Sparkles while typing */}
        {!isDone && (
          <div className="absolute -top-2 -right-2 pointer-events-none flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-accent animate-bounce" />
          </div>
        )}
      </div>
    </div>
  );
};

export const AiGlitterPill: React.FC<{ label: string; icon?: React.ReactNode; onClick?: () => void }> = ({ label, icon, onClick }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-accent/20 via-amber-400/20 to-accent/20 border border-accent/40 text-accent font-bold text-xs shadow-xs cursor-pointer select-none ai-glitter-highlight"
    >
      {icon || <Wand2 className="w-3.5 h-3.5 text-accent animate-pulse" />}
      <span>{label}</span>
    </motion.div>
  );
};
