import React, { useState, useEffect } from 'react';
import { Play, Pause, Music, ExternalLink, Disc, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { AttachedSong } from '../types';
import { toggleAudioPreview, subscribeToAudio, getCurrentPlayingUrl } from '../services/songService';
import { triggerHaptic } from '../utils/uiSprings';
import { motion, AnimatePresence } from 'motion/react';

interface AudioSongPlayerProps {
  song: AttachedSong;
  compact?: boolean;
  className?: string;
  onLyricsClick?: () => void;
  showLyricsDefault?: boolean;
}

export const AudioSongPlayer: React.FC<AudioSongPlayerProps> = ({
  song,
  compact = false,
  className = '',
  showLyricsDefault = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLyrics, setShowLyrics] = useState(showLyricsDefault);

  useEffect(() => {
    // Check if this song is currently playing
    const current = getCurrentPlayingUrl();
    if (current && current === song.previewUrl) {
      setIsPlaying(true);
    }

    const unsubscribe = subscribeToAudio((playing, url) => {
      setIsPlaying(playing && url === song.previewUrl);
    });

    return () => {
      unsubscribe();
    };
  }, [song.previewUrl]);

  const handlePlayToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(8);
    if (!song.previewUrl) return;
    toggleAudioPreview(song.previewUrl);
  };

  if (compact) {
    return (
      <div 
        className={`px-3 py-2 rounded-2xl bg-surface-highlight/40 border border-surface-highlight flex items-center justify-between gap-2.5 text-xs ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
          {song.coverArt ? (
            <img 
              src={song.coverArt} 
              alt={song.title} 
              className={`w-8 h-8 rounded-lg object-cover shrink-0 shadow-xs border border-surface-highlight ${isPlaying ? 'ring-2 ring-accent animate-pulse' : ''}`}
            />
          ) : (
            <div className={`p-1.5 rounded-lg bg-accent/15 text-accent shrink-0 ${isPlaying ? 'animate-spin-slow' : ''}`}>
              <Music className="w-4 h-4" />
            </div>
          )}
          <div className="truncate text-left">
            <span className="font-bold text-primary block truncate text-xs">{song.title}</span>
            <span className="text-[10px] text-secondary block truncate">
              {song.artist || 'Attached Soundtrack'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {song.previewUrl && (
            <button
              type="button"
              onClick={handlePlayToggle}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer ${
                isPlaying
                  ? 'bg-accent text-accent-fg ring-2 ring-accent/30'
                  : 'bg-surface hover:bg-accent/15 text-accent'
              }`}
              title={isPlaying ? "Pause preview snippet" : "Play preview snippet"}
            >
              {isPlaying ? (
                <Pause className="w-3 h-3 fill-current" />
              ) : (
                <Play className="w-3 h-3 ml-0.5 fill-current" />
              )}
            </button>
          )}

          {song.url && (
            <a
              href={song.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-secondary hover:text-accent rounded-lg transition"
              title="Open track"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`rounded-2xl sm:rounded-3xl bg-surface/90 backdrop-blur-md border border-surface-highlight p-3 sm:p-4 shadow-sm transition-all hover:border-accent/40 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {song.coverArt ? (
            <div className="relative shrink-0">
              <img 
                src={song.coverArt} 
                alt={song.title} 
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shadow-sm border border-surface-highlight ${
                  isPlaying ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''
                }`}
              />
              {isPlaying && (
                <div className="absolute -bottom-1 -right-1 p-0.5 bg-accent text-accent-fg rounded-full shadow-xs">
                  <Disc className="w-3 h-3 animate-spin-slow" />
                </div>
              )}
            </div>
          ) : (
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0 ${
              isPlaying ? 'animate-pulse' : ''
            }`}>
              <Disc className="w-6 h-6" />
            </div>
          )}

          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm sm:text-base text-primary truncate block leading-snug">
                {song.title}
              </h4>
            </div>
            <p className="text-xs text-secondary truncate mt-0.5">
              {song.artist || 'Unknown Artist'} {song.album ? `• ${song.album}` : ''}
            </p>
            {song.favoriteExcerpt && (
              <p className="text-[11px] font-serif italic text-accent truncate mt-1">
                &ldquo;{song.favoriteExcerpt}&rdquo;
              </p>
            )}
            {isPlaying && (
              <span className="inline-flex items-center gap-1 text-[10px] text-accent font-semibold uppercase tracking-wider mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                Playing 30s preview snippet
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {song.previewUrl && (
            <button
              type="button"
              onClick={handlePlayToggle}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer shadow-md ${
                isPlaying
                  ? 'bg-accent text-accent-fg ring-4 ring-accent/25 animate-pulse'
                  : 'bg-accent text-accent-fg hover:opacity-90'
              }`}
              title={isPlaying ? "Pause 30-sec Preview" : "Play 30-sec Preview Snippet"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 ml-0.5 fill-current" />
              )}
            </button>
          )}

          {song.lyrics && (
            <button
              type="button"
              onClick={() => setShowLyrics(!showLyrics)}
              className={`p-2 sm:p-2.5 rounded-xl border transition flex items-center gap-1 text-xs cursor-pointer ${
                showLyrics 
                  ? 'bg-accent/15 border-accent text-accent' 
                  : 'bg-surface-highlight/50 border-surface-highlight text-secondary hover:text-primary'
              }`}
              title="Toggle song lyrics"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-semibold">Lyrics</span>
              {showLyrics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          {song.url && (
            <a
              href={song.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 sm:p-2.5 rounded-xl bg-surface-highlight/50 hover:bg-surface-highlight text-secondary hover:text-accent transition"
              title="Open full track"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Lyrics Dropdown / Viewer */}
      <AnimatePresence>
        {showLyrics && song.lyrics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-surface-highlight/60 overflow-hidden"
          >
            <div className="p-3 sm:p-4 rounded-xl bg-surface-lowest/70 border border-surface-highlight/70 text-left">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-accent mb-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Lyrics</span>
              </div>
              <div className="font-serif text-xs sm:text-sm text-primary/85 leading-relaxed whitespace-pre-line italic max-h-48 overflow-y-auto pr-2 no-scrollbar">
                {song.lyrics}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AudioSongPlayer;
