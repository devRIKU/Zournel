export interface EdgeVoiceOption {
  id: string;
  name: string;
  gender: 'female' | 'male';
  description: string;
  isMicrosoftNatural: boolean;
}

export const EDGE_VOICES: EdgeVoiceOption[] = [
  {
    id: 'en-US-AriaNeural',
    name: 'Microsoft Aria (Natural)',
    gender: 'female',
    description: 'Warm, conversational & expressive (Edge Default)',
    isMicrosoftNatural: true
  },
  {
    id: 'en-US-GuyNeural',
    name: 'Microsoft Guy (Natural)',
    gender: 'male',
    description: 'Calm, thoughtful & resonant',
    isMicrosoftNatural: true
  },
  {
    id: 'en-US-JennyNeural',
    name: 'Microsoft Jenny (Natural)',
    gender: 'female',
    description: 'Friendly, empathetic & soothing',
    isMicrosoftNatural: true
  }
];

class EdgeTtsService {
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private selectedVoiceId: string = 'en-US-AriaNeural';
  private isCurrentlySpeaking: boolean = false;
  private onStatusChangeListeners: Set<(speaking: boolean, textSnippet?: string) => void> = new Set();

  constructor() {
    // Load saved voice preference
    try {
      const saved = localStorage.getItem('zournel_edge_tts_voice');
      if (saved && EDGE_VOICES.some(v => v.id === saved)) {
        this.selectedVoiceId = saved;
      }
    } catch (e) {}

    // Ensure voices are loaded
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        // Cached in background
      };
    }
  }

  public subscribe(listener: (speaking: boolean, textSnippet?: string) => void): () => void {
    this.onStatusChangeListeners.add(listener);
    listener(this.isCurrentlySpeaking);
    return () => this.onStatusChangeListeners.delete(listener);
  }

  private notify(speaking: boolean, snippet?: string) {
    this.isCurrentlySpeaking = speaking;
    this.onStatusChangeListeners.forEach(fn => fn(speaking, snippet));
  }

  public getSelectedVoice(): EdgeVoiceOption {
    return EDGE_VOICES.find(v => v.id === this.selectedVoiceId) || EDGE_VOICES[0];
  }

  public setVoice(voiceId: string) {
    if (EDGE_VOICES.some(v => v.id === voiceId)) {
      this.selectedVoiceId = voiceId;
      try {
        localStorage.setItem('zournel_edge_tts_voice', voiceId);
      } catch (e) {}
    }
  }

  public isSpeaking(): boolean {
    return this.isCurrentlySpeaking;
  }

  public stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.activeUtterance = null;
    this.notify(false);
  }

  /**
   * Cleans text to produce natural spoken narration:
   * Strips markdown symbols, code fences, emojis, and bullet syntax.
   */
  private prepareSpeechText(rawText: string): string {
    return rawText
      .replace(/```[\s\S]*?```/g, ' ') // Remove code blocks
      .replace(/`([^`]+)`/g, '$1') // Inline code
      .replace(/[*_~#]/g, '') // Formatting stars and hashes
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Markdown links
      .replace(/•\s*/g, ' ') // Bullet points
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Discovers the best matching Microsoft Edge voice or high-grade natural synthesis voice.
   */
  private findBestVoice(voiceId: string): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const isGuy = voiceId.includes('Guy');
    const isJenny = voiceId.includes('Jenny');
    const targetName = isGuy ? 'Guy' : isJenny ? 'Jenny' : 'Aria';

    // 1. Check for official Microsoft Online (Natural) voice
    const edgeNatural = voices.find(v => 
      v.name.includes(targetName) || 
      (v.name.toLowerCase().includes('microsoft') && v.name.toLowerCase().includes(targetName.toLowerCase())) ||
      (v.name.toLowerCase().includes('microsoft') && v.name.toLowerCase().includes('natural') && v.lang.startsWith('en'))
    );
    if (edgeNatural) return edgeNatural;

    // 2. Check for any Microsoft English voice
    const anyMsVoice = voices.find(v => 
      v.name.toLowerCase().includes('microsoft') && v.lang.startsWith('en')
    );
    if (anyMsVoice) return anyMsVoice;

    // 3. Fallback to high quality English natural voice
    const naturalEn = voices.find(v => 
      (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('samantha')) &&
      v.lang.startsWith('en')
    );
    if (naturalEn) return naturalEn;

    // 4. Default English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
  }

  public async speak(text: string, overrideVoiceId?: string): Promise<void> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this environment');
      return;
    }

    this.stop();

    const cleanText = this.prepareSpeechText(text);
    if (!cleanText) return;

    const voiceToUse = overrideVoiceId || this.selectedVoiceId;
    const voiceObj = this.findBestVoice(voiceToUse);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (voiceObj) {
      utterance.voice = voiceObj;
    }

    // Edge Neural calibration for warm, conversational cadence
    utterance.rate = 0.98;
    utterance.pitch = voiceToUse.includes('Guy') ? 0.92 : 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      this.notify(true, cleanText.slice(0, 40) + '...');
    };

    utterance.onend = () => {
      this.notify(false);
      this.activeUtterance = null;
    };

    utterance.onerror = (e) => {
      console.warn('Edge TTS playback issue:', e);
      this.notify(false);
      this.activeUtterance = null;
    };

    this.activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }
}

export const edgeTts = new EdgeTtsService();
