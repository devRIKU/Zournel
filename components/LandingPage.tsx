import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Sun, Moon, Cloud, CheckCircle, BookOpen, Coffee, Sparkles } from './Icons';
import { Task, JournalEntry } from '../types';
import { extractAutoTitle } from '../services/geminiService';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CardSpotlight } from './ui/card-spotlight';
import { SpotlightGlow } from './ui/background-beams';
import { SparklesCore } from './ui/sparkles';
import { ShimmerButton } from './ui/moving-border';
import { iosSpring, iosSpringSnappy } from '../utils/uiSprings';

interface LandingPageProps {
  onEnter: () => void;
  tasks: Task[];
  journalEntries: JournalEntry[];
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter, tasks, journalEntries }) => {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const pendingTasks = tasks.filter((t) => !t.completed);
  const highPriorityCount = pendingTasks.filter((t) => t.priority === 'high').length;
  const recentEntry = [...journalEntries].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
  const nextTask = pendingTasks.sort((a, b) => (a.priority === 'high' ? -1 : 1))[0];

  return (
    <div className="min-h-screen bg-surface-lowest text-primary font-sans flex flex-col items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden select-none">
      {/* Aceternity Spotlight Glow */}
      <SpotlightGlow />

      {/* Aceternity Subtle Sparkles in Background */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <SparklesCore
          particleDensity={18}
          minSize={0.8}
          maxSize={2.2}
          particleColor="var(--color-accent)"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={iosSpring}
        className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center"
      >
        {/* Date Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface/80 backdrop-blur-xl border border-surface-highlight shadow-sm mb-4">
          {greeting.includes('Morning') ? (
            <Sun className="w-4 h-4 text-accent" />
          ) : greeting.includes('Afternoon') ? (
            <Cloud className="w-4 h-4 text-accent" />
          ) : (
            <Moon className="w-4 h-4 text-accent" />
          )}
          <span className="text-[10px] sm:text-xs font-grotesk font-semibold tracking-[0.2em] text-secondary uppercase">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>

        {/* Hero Title */}
        <header className="text-center mb-8 sm:mb-12 space-y-3">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold text-primary tracking-tight leading-tight">
            {greeting}.
          </h1>
          <p className="text-base sm:text-xl text-secondary font-normal max-w-md sm:max-w-lg mx-auto leading-relaxed">
            Your mindful sanctuary. You have{' '}
            <strong className="font-semibold text-accent">
              {pendingTasks.length} pending task{pendingTasks.length === 1 ? '' : 's'}
            </strong>{' '}
            ready for focus.
          </p>
        </header>

        {/* Aceternity Spotlight Bento Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full mb-8 sm:mb-10">
          {/* Focus Task Card with Aceternity CardSpotlight */}
          <CardSpotlight
            onClick={onEnter}
            className="cursor-pointer border-surface-highlight hover:border-accent/50 transition-all rounded-[2rem] p-6 sm:p-7 flex flex-col justify-between min-h-[220px]"
          >
            <div className="flex items-center justify-between w-full mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-accent/15 text-accent">
                  <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
                  Focus Task
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                Open Tasks →
              </Badge>
            </div>

            {nextTask ? (
              <div className="space-y-3 flex-grow flex flex-col justify-between">
                <p className="text-lg sm:text-xl font-display font-medium text-primary line-clamp-3 leading-snug">
                  {nextTask.text}
                </p>
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  {nextTask.priority === 'high' && (
                    <Badge variant="destructive" className="uppercase font-bold tracking-wider">
                      High Priority
                    </Badge>
                  )}
                  <span className="text-xs text-secondary/80">
                    {highPriorityCount > 0 ? `+ ${highPriorityCount} more high priority` : 'Ready to start'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center flex-grow text-secondary text-sm">
                <span>All tasks clear. Time to unwind.</span>
              </div>
            )}
          </CardSpotlight>

          {/* Latest Memory Card with Aceternity CardSpotlight */}
          <CardSpotlight
            onClick={onEnter}
            className="cursor-pointer border-surface-highlight hover:border-accent/50 transition-all rounded-[2rem] p-6 sm:p-7 flex flex-col justify-between min-h-[220px]"
          >
            <div className="flex items-center justify-between w-full mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-accent/15 text-accent">
                  <BookOpen className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
                  Latest Memory
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                Journal →
              </Badge>
            </div>

            {recentEntry ? (
              <div className="space-y-3 flex-grow flex flex-col justify-between">
                <div>
                  <h4 className="text-lg sm:text-xl font-display font-bold text-primary line-clamp-1">
                    {recentEntry.title || extractAutoTitle(recentEntry.content)}
                  </h4>
                  <p className="text-xs sm:text-sm text-secondary line-clamp-2 mt-1 leading-relaxed">
                    "{recentEntry.content.replace(/[#*`]/g, '').slice(0, 90)}..."
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <span className="text-xs font-mono text-secondary/80">
                    {new Date(recentEntry.createdAt).toLocaleDateString()}
                  </span>
                  {recentEntry.mood && (
                    <Badge variant="default" className="uppercase font-bold tracking-wider">
                      {recentEntry.mood}
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center flex-grow text-secondary text-sm">
                <span>No entries yet. Capture your first thought.</span>
              </div>
            )}
          </CardSpotlight>
        </div>

        {/* Aceternity Shimmer Action Button */}
        <div className="flex justify-center w-full">
          <ShimmerButton
            size="lg"
            onClick={onEnter}
            className="w-full sm:w-auto px-8 sm:px-12 py-3 rounded-full text-sm uppercase tracking-[0.15em] font-bold"
          >
            <span>Open Zournel</span>
            <ArrowRight className="w-4 h-4" />
          </ShimmerButton>
        </div>

        <div className="mt-8 text-center flex items-center gap-2 text-[10px] text-secondary uppercase tracking-[0.25em] opacity-60">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>Aceternity &amp; shadcn Hybrid Architecture</span>
        </div>
      </motion.div>
    </div>
  );
};

export default LandingPage;
