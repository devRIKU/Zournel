import React, { useState, useEffect, useRef } from 'react';
import { 
  Music, Check, Trash2, Search, Play, Pause, ExternalLink, 
  Disc, Mic, FileText, Loader2, Sparkles, Volume2 
} from 'lucide-react';
import { AttachedSong } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { 
  searchSongsOnline, 
  fetchLyricsFromApi, 
  toggleAudioPreview, 
  stopAudioPreview, 
  subscribeToAudio, 
  SongApiResult 
} from '../services/songService';
import { triggerHaptic } from '../utils/uiSprings';

interface SongAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (song: AttachedSong) => void;
  onRemove?: () => void;
  initialSong?: AttachedSong;
}

const AMBIENT_PRESETS: Partial<AttachedSong>[] = [
  { title: 'Weightless', artist: 'Marconi Union', album: 'Ambient 1' },
  { title: 'Clair de Lune', artist: 'Claude Debussy', album: 'Suite bergamasque' },
  { title: 'Gymnopédie No. 1', artist: 'Erik Satie', album: 'Piano Works' },
  { title: 'Yellow', artist: 'Coldplay', album: 'Parachutes' },
  { title: 'Midnight City', artist: 'M83', album: 'Hurry Up, We\'re Dreaming' },
];

export const SongAttachmentModal: React.FC<SongAttachmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onRemove,
  initialSong,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'lyrics' | 'manual'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SongApiResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Selected song fields
  const [title, setTitle] = useState(initialSong?.title || '');
  const [artist, setArtist] = useState(initialSong?.artist || '');
  const [album, setAlbum] = useState(initialSong?.album || '');
  const [coverArt, setCoverArt] = useState(initialSong?.coverArt || '');
  const [previewUrl, setPreviewUrl] = useState(initialSong?.previewUrl || '');
  const [url, setUrl] = useState(initialSong?.url || '');
  const [lyrics, setLyrics] = useState(initialSong?.lyrics || '');
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);

  // Audio preview state
  const [playingPreviewUrl, setPlayingPreviewUrl] = useState<string | null>(null);

  // Subscribe to audio changes
  useEffect(() => {
    const unsubscribe = subscribeToAudio((isPlaying, currentUrl) => {
      setPlayingPreviewUrl(isPlaying ? currentUrl : null);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Stop audio on modal close
  useEffect(() => {
    if (!isOpen) {
      stopAudioPreview();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialSong?.title || '');
      setArtist(initialSong?.artist || '');
      setAlbum(initialSong?.album || '');
      setCoverArt(initialSong?.coverArt || '');
      setPreviewUrl(initialSong?.previewUrl || '');
      setUrl(initialSong?.url || '');
      setLyrics(initialSong?.lyrics || '');
      setSearchQuery(initialSong?.title ? `${initialSong.title} ${initialSong.artist || ''}`.trim() : '');
      setSearchResults([]);
      setSearchError(null);
      if (initialSong?.lyrics && !initialSong?.title) {
        setActiveTab('lyrics');
      } else {
        setActiveTab('search');
      }
    }
  }, [isOpen, initialSong]);

  // Debounced live search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const results = await searchSongsOnline(term);
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError('No matching songs found. You can enter details manually.');
      }
    } catch (err) {
      setSearchError('Could not fetch songs. Please check connection or use manual entry.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (val.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(val);
      }, 350);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectSong = (song: SongApiResult) => {
    triggerHaptic(10);
    setTitle(song.title);
    setArtist(song.artist);
    setAlbum(song.album);
    setCoverArt(song.coverArt);
    setPreviewUrl(song.previewUrl || '');
    setUrl(song.url || '');

    // If lyrics are currently empty, auto-attempt lyrics fetch
    if (!lyrics.trim()) {
      fetchLyrics(song.title, song.artist);
    }
  };

  const handleTogglePreview = (e: React.MouseEvent, songPreviewUrl?: string) => {
    e.stopPropagation();
    triggerHaptic(8);
    if (!songPreviewUrl) return;
    toggleAudioPreview(songPreviewUrl);
  };

  const fetchLyrics = async (songTitle: string, songArtist?: string) => {
    if (!songTitle.trim()) return;
    setIsFetchingLyrics(true);
    try {
      const foundLyrics = await fetchLyricsFromApi(songTitle, songArtist);
      if (foundLyrics) {
        setLyrics(foundLyrics);
      }
    } catch (e) {
      console.warn('Lyrics fetch failed:', e);
    } finally {
      setIsFetchingLyrics(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !lyrics.trim()) return;

    triggerHaptic(12);
    stopAudioPreview();
    onSave({
      title: title.trim() || 'Untitled Song / Lyrics',
      artist: artist.trim() || undefined,
      album: album.trim() || undefined,
      coverArt: coverArt.trim() || undefined,
      previewUrl: previewUrl.trim() || undefined,
      url: url.trim() || undefined,
      lyrics: lyrics.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { stopAudioPreview(); onClose(); } }}>
      <DialogContent onClose={() => { stopAudioPreview(); onClose(); }} className="max-w-lg w-full max-h-[92vh] flex flex-col p-5 sm:p-6 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3 border-b border-surface-highlight/50">
          <div className="flex items-center justify-between w-full pr-7">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-accent/15 text-accent rounded-2xl border border-accent/25 shadow-xs shrink-0">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-display font-bold">Soundtrack &amp; Lyrics</DialogTitle>
                <DialogDescription className="text-xs text-secondary">
                  Attach real songs, cover art, audio previews, and lyrics
                </DialogDescription>
              </div>
            </div>

            {initialSong && onRemove && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  stopAudioPreview();
                  onRemove();
                  onClose();
                }}
                className="h-8 px-2.5 text-xs gap-1.5"
                title="Remove attached soundtrack"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Remove</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Selected Track Banner (if selected) */}
        {title && (
          <div className="mt-3 p-3 bg-surface-highlight/40 border border-accent/30 rounded-2xl flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {coverArt ? (
                <img 
                  src={coverArt} 
                  alt={title} 
                  className="w-12 h-12 rounded-xl object-cover shadow-sm shrink-0 border border-surface-highlight"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
                  <Disc className="w-6 h-6 animate-spin-slow" />
                </div>
              )}
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-primary truncate block">{title}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-accent/15 text-accent font-semibold shrink-0">
                    Selected
                  </span>
                </div>
                <p className="text-xs text-secondary truncate">
                  {artist || 'Unknown Artist'} {album ? `• ${album}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {previewUrl && (
                <button
                  type="button"
                  onClick={(e) => handleTogglePreview(e, previewUrl)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer ${
                    playingPreviewUrl === previewUrl
                      ? 'bg-accent text-accent-fg ring-4 ring-accent/25 animate-pulse'
                      : 'bg-surface-highlight hover:bg-accent/20 text-accent'
                  }`}
                  title={playingPreviewUrl === previewUrl ? "Pause Preview" : "Play 30s Preview"}
                >
                  {playingPreviewUrl === previewUrl ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5 fill-current" />
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tabs for Navigation */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="flex-1 flex flex-col min-h-0 mt-3">
          <TabsList className="grid grid-cols-3 mb-3 shrink-0">
            <TabsTrigger value="search" className="text-xs gap-1.5 py-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>Live Search</span>
            </TabsTrigger>
            <TabsTrigger value="lyrics" className="text-xs gap-1.5 py-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Lyrics {lyrics.trim() ? '•' : ''}</span>
            </TabsTrigger>
            <TabsTrigger value="manual" className="text-xs gap-1.5 py-1.5">
              <Disc className="w-3.5 h-3.5" />
              <span>Details</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: LIVE SEARCH */}
          <TabsContent value="search" className="flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
            {/* Search Input Bar */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    performSearch(searchQuery);
                  }
                }}
                placeholder="Search song title, artist, or album..."
                className="pl-9 pr-20 h-10 text-sm bg-surface/80 rounded-xl"
                autoFocus
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => performSearch(searchQuery)}
                    className="h-7 px-2 text-xs text-accent hover:bg-accent/10"
                  >
                    Search
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Suggestions Pills */}
            <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
              <span className="text-[10px] text-secondary uppercase font-bold tracking-wider shrink-0">Try:</span>
              {AMBIENT_PRESETS.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => {
                    const term = `${p.title} ${p.artist}`;
                    setSearchQuery(term);
                    performSearch(term);
                  }}
                  className="px-2.5 py-1 rounded-full bg-surface-highlight/50 hover:bg-accent/15 hover:text-accent text-[11px] text-secondary shrink-0 transition"
                >
                  {p.title}
                </button>
              ))}
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
              {isSearching && searchResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-secondary gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  <p className="text-xs">Searching global music catalog...</p>
                </div>
              )}

              {searchError && (
                <div className="p-3 text-center text-xs text-secondary bg-surface-highlight/30 rounded-xl border border-surface-highlight">
                  {searchError}
                </div>
              )}

              {!isSearching && searchResults.length === 0 && !searchError && (
                <div className="flex flex-col items-center justify-center py-10 text-center text-secondary gap-2 opacity-60">
                  <Music className="w-8 h-8 text-accent/50" />
                  <p className="text-xs">Type a song title to fetch live cover art, audio preview, and metadata</p>
                </div>
              )}

              {searchResults.map((song) => {
                const isSelected = title.toLowerCase() === song.title.toLowerCase() && artist.toLowerCase() === song.artist.toLowerCase();
                const isPlaying = playingPreviewUrl === song.previewUrl;

                return (
                  <div
                    key={song.id}
                    onClick={() => handleSelectSong(song)}
                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-accent/15 border-accent shadow-xs'
                        : 'bg-surface/70 border-surface-highlight/70 hover:bg-surface-highlight/50 hover:border-accent/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {song.coverArt ? (
                        <img 
                          src={song.coverArt} 
                          alt={song.title} 
                          className="w-11 h-11 rounded-lg object-cover shadow-xs shrink-0 border border-surface-highlight/60"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-surface-highlight flex items-center justify-center text-secondary shrink-0">
                          <Disc className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0 text-left">
                        <span className="text-xs sm:text-sm font-bold text-primary truncate block">
                          {song.title}
                        </span>
                        <p className="text-[11px] text-secondary truncate">
                          {song.artist} • <span className="opacity-75">{song.album}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {song.previewUrl && (
                        <button
                          type="button"
                          onClick={(e) => handleTogglePreview(e, song.previewUrl)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-90 ${
                            isPlaying
                              ? 'bg-accent text-accent-fg animate-pulse'
                              : 'bg-surface-highlight/80 hover:bg-accent hover:text-accent-fg text-secondary'
                          }`}
                          title={isPlaying ? "Pause Preview" : "Play 30s Preview"}
                        >
                          {isPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
                          )}
                        </button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? "default" : "secondary"}
                        className="h-8 px-2.5 text-xs rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectSong(song);
                        }}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : 'Select'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 2: LYRICS */}
          <TabsContent value="lyrics" className="flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between gap-2 shrink-0">
              <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-accent" />
                <span>Memory Lyrics / Poetic Lines</span>
              </label>

              {title && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fetchLyrics(title, artist)}
                  disabled={isFetchingLyrics}
                  className="h-7 px-2 text-xs gap-1"
                  title="Auto-fetch lyrics online"
                >
                  {isFetchingLyrics ? (
                    <Loader2 className="w-3 h-3 animate-spin text-accent" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-accent" />
                  )}
                  <span>{isFetchingLyrics ? 'Fetching...' : 'Fetch Lyrics'}</span>
                </Button>
              )}
            </div>

            <Textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Paste or write lyrics, verses, or lines from this song that capture this memory..."
              className="flex-1 min-h-[180px] p-3 text-xs sm:text-sm font-serif leading-relaxed bg-surface/80 rounded-xl resize-none"
            />
            <p className="text-[10px] text-secondary shrink-0">
              Lyrics are saved directly to this journal memory and displayed with poetic formatting.
            </p>
          </TabsContent>

          {/* TAB 3: MANUAL EDITING */}
          <TabsContent value="manual" className="flex-1 flex flex-col min-h-0 space-y-3 overflow-y-auto pr-1">
            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                Song Title <span className="text-accent">*</span>
              </label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Yellow, Clair de Lune..."
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-primary mb-1">Artist</label>
                <Input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="e.g. Coldplay"
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-primary mb-1">Album</label>
                <Input
                  type="text"
                  value={album}
                  onChange={(e) => setAlbum(e.target.value)}
                  placeholder="e.g. Parachutes"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">Cover Art URL</label>
              <Input
                type="url"
                value={coverArt}
                onChange={(e) => setCoverArt(e.target.value)}
                placeholder="https://... cover image"
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">Audio Preview Link (30s MP3/M4A)</label>
              <Input
                type="url"
                value={previewUrl}
                onChange={(e) => setPreviewUrl(e.target.value)}
                placeholder="https://... audio preview"
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">Stream Link (Apple Music / Spotify)</label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://open.spotify.com/..."
                className="h-9 text-xs"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="shrink-0 pt-3 border-t border-surface-highlight/50 flex items-center justify-between sm:justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              stopAudioPreview();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!title.trim() && !lyrics.trim()}
            onClick={handleSubmit}
            className="gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Attach to Memory</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SongAttachmentModal;
