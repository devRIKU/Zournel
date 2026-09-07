import { AttachedSong } from '../types';

export interface SongApiResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverArt: string;
  previewUrl?: string;
  url?: string;
  releaseYear?: string;
}

/**
 * Searches songs via the live iTunes Search API.
 * Free, zero auth, live catalog, covers title, artist, album, cover art, and 30s preview snippet.
 */
export async function searchSongsOnline(query: string): Promise<SongApiResult[]> {
  if (!query || !query.trim()) return [];

  try {
    const encoded = encodeURIComponent(query.trim());
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encoded}&entity=song&limit=15`
    );

    if (!response.ok) {
      throw new Error(`Music search failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((item: any) => {
      // Upscale 100x100 artwork to crisp 600x600
      let cover = item.artworkUrl100 || item.artworkUrl60 || '';
      if (cover) {
        cover = cover.replace('100x100bb.jpg', '600x600bb.jpg').replace('100x100bb.png', '600x600bb.png');
      }

      const releaseYear = item.releaseDate ? new Date(item.releaseDate).getFullYear().toString() : undefined;

      return {
        id: String(item.trackId || Math.random().toString(36).substring(2, 9)),
        title: item.trackName || 'Unknown Title',
        artist: item.artistName || 'Unknown Artist',
        album: item.collectionName || item.collectionCensoredName || 'Single',
        coverArt: cover,
        previewUrl: item.previewUrl || undefined,
        url: item.trackViewUrl || undefined,
        releaseYear,
      };
    });
  } catch (error) {
    console.warn('Live music search error:', error);
    return [];
  }
}

/**
 * Fetches lyrics for a track using lyrics.ovh with graceful fallback.
 */
export async function fetchLyricsFromApi(title: string, artist?: string): Promise<string | null> {
  if (!title || !title.trim()) return null;

  try {
    const cleanTitle = encodeURIComponent(title.trim().replace(/\(.*?\)/g, '').trim());
    const cleanArtist = encodeURIComponent((artist || '').trim().replace(/\(.*?\)/g, '').trim());

    if (cleanArtist) {
      const res = await fetch(`https://api.lyrics.ovh/v1/${cleanArtist}/${cleanTitle}`);
      if (res.ok) {
        const json = await res.json();
        if (json.lyrics && json.lyrics.trim().length > 0) {
          return json.lyrics.trim();
        }
      }
    }
  } catch (e) {
    // Non-blocking fallback
  }

  return null;
}

// Global preview audio controller
let currentAudio: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;
const listeners = new Set<(isPlaying: boolean, url: string | null) => void>();

function notifyAudioChange(isPlaying: boolean, url: string | null) {
  listeners.forEach(cb => cb(isPlaying, url));
}

export function subscribeToAudio(cb: (isPlaying: boolean, url: string | null) => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getCurrentPlayingUrl(): string | null {
  return currentAudio && !currentAudio.paused ? currentAudioUrl : null;
}

export function toggleAudioPreview(previewUrl?: string): boolean {
  if (!previewUrl) return false;

  // If already playing this preview, pause it
  if (currentAudio && currentAudioUrl === previewUrl && !currentAudio.paused) {
    currentAudio.pause();
    notifyAudioChange(false, previewUrl);
    return false;
  }

  // Stop previous audio if any
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
    notifyAudioChange(false, null);
  }

  const audio = new Audio(previewUrl);
  audio.volume = 0.85;
  currentAudio = audio;
  currentAudioUrl = previewUrl;

  audio.onended = () => {
    notifyAudioChange(false, previewUrl);
  };

  audio.onerror = () => {
    notifyAudioChange(false, previewUrl);
  };

  audio.play()
    .then(() => {
      notifyAudioChange(true, previewUrl);
    })
    .catch((err) => {
      console.warn('Audio playback failed or blocked:', err);
      notifyAudioChange(false, previewUrl);
    });

  return true;
}

export function stopAudioPreview() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
    notifyAudioChange(false, null);
  }
}
