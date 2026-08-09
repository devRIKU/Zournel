
import React from 'react';
import { X, Mail, Youtube, Instagram, Twitter, Github, ArrowUpRight, UserCircle2 } from './Icons';

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const CONTACTS = [
    { 
      label: 'Email', 
      value: 'sannivachatterjee25@gmail.com', 
      icon: Mail, 
      href: 'mailto:sannivachatterjee25@gmail.com',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    { 
      label: 'GitHub', 
      value: '@sannivachatterjee25', 
      icon: Github, 
      href: 'https://github.com/sannivachatterjee25',
      color: 'text-gray-900 dark:text-white',
      bg: 'bg-gray-500/10'
    },
    { 
      label: 'YouTube', 
      value: 'Subscribe', 
      icon: Youtube, 
      href: 'https://youtube.com', // Placeholder as per request context
      color: 'text-red-600',
      bg: 'bg-red-500/10'
    },
    { 
      label: 'Instagram', 
      value: 'Follow', 
      icon: Instagram, 
      href: 'https://instagram.com', // Placeholder as per request context
      color: 'text-pink-600',
      bg: 'bg-pink-500/10'
    },
    { 
      label: 'Twitter', 
      value: 'Follow', 
      icon: Twitter, 
      href: 'https://twitter.com', // Placeholder as per request context
      color: 'text-sky-500',
      bg: 'bg-sky-500/10'
    }
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-surface rounded-[2.5rem] w-full max-w-md shadow-2xl relative animate-scale-in border border-white/10 overflow-hidden">
        
        <div className="flex justify-between items-center p-8 border-b border-surface-highlight bg-surface">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-accent/10 rounded-2xl">
                <UserCircle2 className="w-6 h-6 text-accent" />
             </div>
             <div>
               <h2 className="text-2xl font-display font-bold text-primary">Contacts</h2>
               <p className="text-secondary text-[10px] font-grotesk tracking-widest uppercase mt-1">Let's Connect</p>
             </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-surface-highlight rounded-xl transition-colors text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3 bg-surface/50">
          {CONTACTS.map((contact, idx) => (
            <a 
              key={idx}
              href={contact.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-2xl bg-surface hover:bg-surface-highlight border border-surface-highlight transition group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${contact.bg} ${contact.color}`}>
                  <contact.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-secondary/70 mb-0.5">{contact.label}</p>
                  <p className="text-sm font-semibold text-primary">{contact.value}</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-secondary opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
