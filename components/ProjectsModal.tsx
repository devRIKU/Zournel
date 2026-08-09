
import React, { useEffect, useState } from 'react';
import { X, GitBranch, Star, ExternalLink, Loader2, Github, Code2 } from './Icons';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Repo {
  id: number;
  name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  language: string;
  updated_at: string;
}

const GITHUB_USERNAME = 'sannivachatterjee25';

export const ProjectsModal: React.FC<ProjectsModalProps> = ({ isOpen, onClose }) => {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(false);
      fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&direction=desc`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch');
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            const filtered = data.filter((repo: Repo) => repo.name !== 'Personal-Website' && !repo.description?.includes('Personal Website'));
            setRepos(filtered);
          } else {
            setRepos([]);
          }
          setLoading(false);
        })
        .catch(() => {
          setError(true);
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-surface rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative animate-scale-in flex flex-col max-h-[85vh] overflow-hidden border border-white/10">
        
        {/* Header */}
        <div className="flex justify-between items-center p-8 border-b border-surface-highlight bg-surface shrink-0 z-10">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-purple-500/10 rounded-2xl">
                <Code2 className="w-6 h-6 text-purple-500" />
             </div>
             <div>
               <h2 className="text-2xl font-display font-bold text-primary">Projects</h2>
               <p className="text-secondary text-[10px] font-grotesk tracking-widest uppercase mt-1">Latest from GitHub</p>
             </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-surface-highlight rounded-xl transition-colors text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 md:p-8 space-y-4 no-scrollbar bg-surface/50">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <Loader2 className="w-8 h-8 animate-spin text-accent mb-2" />
                <span className="text-xs font-bold uppercase tracking-widest">Fetching Repositories...</span>
             </div>
          ) : error ? (
             <div className="text-center py-12 text-secondary">
                <p>Could not load projects at this time.</p>
                <a href={`https://github.com/${GITHUB_USERNAME}`} target="_blank" rel="noreferrer" className="text-accent hover:underline text-sm mt-2 inline-block">Visit GitHub Profile</a>
             </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {repos.map(repo => (
                <a 
                  key={repo.id}
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block p-6 bg-surface border border-surface-highlight rounded-[1.5rem] hover:border-accent/50 hover:shadow-lg transition duration-300 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                    <ExternalLink className="w-5 h-5 text-accent" />
                  </div>
                  
                  <div className="flex items-start justify-between mb-3 pr-8">
                    <h3 className="text-lg font-bold text-primary group-hover:text-accent transition-colors">{repo.name}</h3>
                  </div>
                  
                  <p className="text-secondary text-sm leading-relaxed mb-6 line-clamp-2">
                    {repo.description || "No description provided."}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-secondary font-mono">
                    {repo.language && (
                      <span className="flex items-center gap-1.5 px-2 py-1 bg-surface-highlight rounded-md">
                        <span className="w-2 h-2 rounded-full bg-accent"></span>
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                       <Star className="w-3.5 h-3.5" />
                       {repo.stargazers_count}
                    </span>
                    <span className="flex items-center gap-1">
                       <GitBranch className="w-3.5 h-3.5" />
                       {new Date(repo.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-surface-highlight bg-surface shrink-0 text-center">
           <a 
             href={`https://github.com/${GITHUB_USERNAME}`}
             target="_blank" 
             rel="noreferrer"
             className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-secondary hover:text-primary transition-colors"
           >
             <Github className="w-4 h-4" />
             <span>View Full Profile</span>
           </a>
        </div>
      </div>
    </div>
  );
};
