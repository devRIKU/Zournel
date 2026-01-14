
import React, { useEffect, useState } from 'react';
import { ArrowRight, Sun, Moon, Cloud, CheckCircle2, BookOpen, Coffee, Sparkles } from 'lucide-react';
import { Task, JournalEntry } from '../types';

interface LandingPageProps {
  onEnter: () => void;
  tasks: Task[];
  journalEntries: JournalEntry[];
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter, tasks, journalEntries }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const handleEnterClick = () => {
    setIsExiting(true);
    setTimeout(onEnter, 800);
  };

  // Derived State
  const pendingTasks = tasks.filter(t => !t.completed);
  const highPriorityCount = pendingTasks.filter(t => t.priority === 'high').length;
  const recentEntry = journalEntries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
  const nextTask = pendingTasks.sort((a, b) => (a.priority === 'high' ? -1 : 1))[0];

  return (
    <div className={`min-h-screen bg-[#F9F7F2] text-[#433E38] font-sans transition-all duration-1000 flex flex-col items-center justify-center p-6 ${isExiting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100'}`}>
      
      {/* Texture Overlay */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      <div className={`relative z-10 w-full max-w-4xl transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        
        {/* Header Section */}
        <header className="text-center mb-16 space-y-4">
           <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/50 border border-[#EBE8DE] shadow-sm mb-4">
              {greeting.includes('Morning') ? <Sun className="w-4 h-4 text-[#C69C6D]" /> : greeting.includes('Afternoon') ? <Cloud className="w-4 h-4 text-[#C69C6D]" /> : <Moon className="w-4 h-4 text-[#C69C6D]" />}
              <span className="text-xs font-grotesk font-medium tracking-[0.2em] text-[#8A847C] uppercase">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
           </div>
           
           <h1 className="text-6xl md:text-8xl font-display font-medium text-[#433E38] tracking-tight">
             {greeting}.
           </h1>
           <p className="text-xl text-[#8A847C] font-light max-w-lg mx-auto">
             Your digital sanctuary is ready. You have <strong className="font-medium text-[#C69C6D]">{pendingTasks.length} pending tasks</strong> waiting for you.
           </p>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          
          {/* Latest Task Card */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-[#EBE8DE] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <CheckCircle2 className="w-32 h-32 text-[#C69C6D]" />
             </div>
             
             <div className="relative z-10 flex flex-col h-full items-start">
                <div className="flex items-center gap-3 mb-6">
                   <div className="p-2 bg-[#F9F7F2] rounded-xl text-[#C69C6D]">
                      <CheckCircle2 className="w-5 h-5" />
                   </div>
                   <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#8A847C]">Focus</h3>
                </div>
                
                {nextTask ? (
                  <>
                     <p className="text-2xl font-display font-medium text-[#433E38] line-clamp-3 mb-4 flex-grow">
                       {nextTask.text}
                     </p>
                     <div className="flex items-center gap-2 mt-auto">
                        {nextTask.priority === 'high' && (
                          <span className="px-3 py-1 bg-red-50 text-red-700 text-[10px] font-bold uppercase tracking-wider rounded-full">High Priority</span>
                        )}
                        <span className="text-xs text-[#8A847C]">
                          {highPriorityCount > 0 ? `+ ${highPriorityCount} other high priority` : 'Stay consistent.'}
                        </span>
                     </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full text-[#8A847C] py-8">
                     <p>All caught up. Enjoy the calm.</p>
                  </div>
                )}
             </div>
          </div>

          {/* Latest Memory Card */}
          <div className="bg-[#433E38] p-8 rounded-[2.5rem] shadow-lg relative overflow-hidden group text-[#F9F7F2]">
             {recentEntry?.image && (
                <div className="absolute inset-0 z-0">
                   <img src={recentEntry.image} alt="Memory" className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-700" />
                   <div className="absolute inset-0 bg-gradient-to-t from-[#433E38] via-[#433E38]/80 to-transparent"></div>
                </div>
             )}
             
             <div className="relative z-10 flex flex-col h-full items-start">
                <div className="flex items-center gap-3 mb-6">
                   <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl text-[#C69C6D]">
                      <BookOpen className="w-5 h-5" />
                   </div>
                   <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Latest Memory</h3>
                </div>
                
                {recentEntry ? (
                   <>
                     <div className="flex-grow">
                        <p className="text-xl font-display leading-relaxed line-clamp-3 italic opacity-90 mb-4">
                           "{recentEntry.content.replace(/[#*`]/g, '').slice(0, 100)}..."
                        </p>
                     </div>
                     <div className="mt-auto flex items-center gap-3">
                        <span className="text-xs font-mono opacity-50 uppercase">
                           {new Date(recentEntry.createdAt).toLocaleDateString()}
                        </span>
                        {recentEntry.mood && (
                           <span className="px-3 py-1 bg-[#C69C6D]/20 text-[#C69C6D] text-[10px] font-bold uppercase tracking-wider rounded-full border border-[#C69C6D]/20">
                              {recentEntry.mood}
                           </span>
                        )}
                     </div>
                   </>
                ) : (
                   <div className="flex flex-col items-center justify-center w-full h-full text-white/40 py-8">
                      <p>No memories yet.</p>
                      <p className="text-sm mt-2">Start writing today.</p>
                   </div>
                )}
             </div>
          </div>

        </div>

        {/* Action */}
        <div className="flex justify-center">
          <button 
            onClick={handleEnterClick}
            className="group relative px-12 py-6 bg-[#C69C6D] text-white rounded-[2rem] font-medium text-sm uppercase tracking-[0.2em] transition-all hover:bg-[#B58B5D] hover:scale-105 hover:shadow-xl active:scale-95 shadow-[#C69C6D]/20 shadow-lg"
          >
            <span className="flex items-center gap-3">
              Open Workspace <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>

        <div className="text-center mt-12">
            <div className="inline-flex items-center gap-2 text-[10px] text-[#8A847C] uppercase tracking-[0.3em] opacity-60">
               <Coffee className="w-3 h-3" />
               <span>Designed for Peace</span>
            </div>
        </div>

      </div>
    </div>
  );
};
