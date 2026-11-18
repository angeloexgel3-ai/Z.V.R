import { loadCustomAudio } from './customAudioStore';

// Web Audio API + Custom Notification Sound & Call Ringtone Controller
export const ROOM_NOTIFICATION_SOUND_URL = '/assets/aistudio/glassy_notification_subtle_sparkle_92079a9b.wav';
export const CALL_RINGTONE_DEFAULT_URL = '/assets/aistudio/glass_pane_response_80185c1d.mp3';

export type MessageSoundPreset = 'default' | 'glass_pane' | 'soft_ping' | 'crystal_pop' | 'custom';
export type CallRingtonePreset = 'default' | 'sparkle' | 'classic_bell' | 'neon_pulse' | 'custom';

export const MESSAGE_SOUND_OPTIONS: { id: MessageSoundPreset; labelTl: string; labelEn: string }[] = [
  { id: 'default', labelTl: 'Default Z.V.R Sparkle', labelEn: 'Default Z.V.R Sparkle' },
  { id: 'glass_pane', labelTl: 'Glass Chime', labelEn: 'Glass Chime' },
  { id: 'soft_ping', labelTl: 'Soft Ping', labelEn: 'Soft Ping' },
  { id: 'crystal_pop', labelTl: 'Crystal Pop', labelEn: 'Crystal Pop' },
  { id: 'custom', labelTl: 'Custom Audio (Sariling Tunog)', labelEn: 'Custom Audio (Uploaded)' },
];

export const CALL_RINGTONE_OPTIONS: { id: CallRingtonePreset; labelTl: string; labelEn: string }[] = [
  { id: 'default', labelTl: 'Default Call Ringtone', labelEn: 'Default Call Ringtone' },
  { id: 'sparkle', labelTl: 'Sparkle Alert Loop', labelEn: 'Sparkle Alert Loop' },
  { id: 'classic_bell', labelTl: 'Classic Phone Ring', labelEn: 'Classic Phone Ring' },
  { id: 'neon_pulse', labelTl: 'Neon Melodic Ring', labelEn: 'Neon Melodic Ring' },
  { id: 'custom', labelTl: 'Custom Ringtone (Sariling Audio)', labelEn: 'Custom Ringtone (Uploaded)' },
];

class SoundController {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  // Message notification state
  private messagePreset: MessageSoundPreset = 'default';
  private customMessageUrl: string | null = null;
  private roomNotificationAudio: HTMLAudioElement | null = null;
  private roomNotificationBuffer: AudioBuffer | null = null;
  private loadedBufferUrl: string | null = null;
  private bufferLoading: boolean = false;

  // Call ringtone state
  private callPreset: CallRingtonePreset = 'default';
  private customCallUrl: string | null = null;
  private activeRingtoneAudio: HTMLAudioElement | null = null;
  private activeRingtoneInterval: any = null;
  private activeRingtoneTimeout: any = null;
  private ringtonePlaying: boolean = false;
  private ringtoneListeners = new Set<(playing: boolean) => void>();

  private unlockBound: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.hydrateFromStorage();
      this.preloadRoomNotification();
      this.bindFirstInteractionUnlock();
    }
  }

  private hydrateFromStorage() {
    try {
      const raw = localStorage.getItem('zvr_portal_settings_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.messageSoundPreset) {
          this.messagePreset = parsed.messageSoundPreset;
        }
        if (parsed.callRingtonePreset) {
          this.callPreset = parsed.callRingtonePreset;
        }
      }
    } catch {}

    // Hydrate any saved custom audio files from IndexedDB
    void loadCustomAudio('message').then((res) => {
      if (res?.objectUrl) {
        this.customMessageUrl = res.objectUrl;
        if (this.messagePreset === 'custom') {
          this.roomNotificationBuffer = null;
          this.loadedBufferUrl = null;
          this.preloadRoomNotification();
        }
      }
    });

    void loadCustomAudio('call').then((res) => {
      if (res?.objectUrl) {
        this.customCallUrl = res.objectUrl;
      }
    });
  }

  private getActiveMessageUrl(): string | null {
    if (this.messagePreset === 'custom') {
      return this.customMessageUrl || ROOM_NOTIFICATION_SOUND_URL;
    }
    if (this.messagePreset === 'glass_pane') {
      return CALL_RINGTONE_DEFAULT_URL;
    }
    if (this.messagePreset === 'default') {
      return ROOM_NOTIFICATION_SOUND_URL;
    }
    return null; // synth preset
  }

  private getActiveCallUrl(): string | null {
    if (this.callPreset === 'custom') {
      return this.customCallUrl || CALL_RINGTONE_DEFAULT_URL;
    }
    if (this.callPreset === 'sparkle') {
      return ROOM_NOTIFICATION_SOUND_URL;
    }
    if (this.callPreset === 'default') {
      return CALL_RINGTONE_DEFAULT_URL;
    }
    return null; // synth preset
  }

  public setMessageSoundConfig(preset: MessageSoundPreset, customUrl?: string | null) {
    this.messagePreset = preset;
    if (customUrl !== undefined) {
      if (this.customMessageUrl && this.customMessageUrl !== customUrl && this.customMessageUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(this.customMessageUrl);
        } catch {}
      }
      this.customMessageUrl = customUrl;
    }
    this.roomNotificationBuffer = null;
    this.loadedBufferUrl = null;
    this.preloadRoomNotification();
  }

  public setCallRingtoneConfig(preset: CallRingtonePreset, customUrl?: string | null) {
    this.callPreset = preset;
    if (customUrl !== undefined) {
      if (this.customCallUrl && this.customCallUrl !== customUrl && this.customCallUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(this.customCallUrl);
        } catch {}
      }
      this.customCallUrl = customUrl;
    }
  }

  private preloadRoomNotification() {
    if (typeof Audio === 'undefined') return;
    const url = this.getActiveMessageUrl();
    if (!url) return;
    try {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.volume = 0.85;
      this.roomNotificationAudio = audio;
    } catch {
      // safe fail
    }
  }

  private bindFirstInteractionUnlock() {
    if (this.unlockBound || typeof window === 'undefined') return;
    this.unlockBound = true;

    const unlock = () => {
      const ctx = this.getRawContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const activeUrl = this.getActiveMessageUrl();
      if (ctx && activeUrl && this.loadedBufferUrl !== activeUrl && !this.bufferLoading) {
        void this.loadNotificationBuffer(ctx, activeUrl);
      }
      if (this.roomNotificationAudio && this.roomNotificationAudio.readyState === 0) {
        try {
          this.roomNotificationAudio.load();
        } catch {}
      }
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  private getRawContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    return this.ctx;
  }

  private async loadNotificationBuffer(ctx: AudioContext, url: string) {
    if (this.bufferLoading || (this.roomNotificationBuffer && this.loadedBufferUrl === url)) return;
    this.bufferLoading = true;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const arr = await res.arrayBuffer();
      this.roomNotificationBuffer = await ctx.decodeAudioData(arr);
      this.loadedBufferUrl = url;
    } catch {
      // fallback to HTMLAudioElement
    } finally {
      this.bufferLoading = false;
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    const ctx = this.getRawContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopCallRingtone();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public isRingtonePlaying(): boolean {
    return this.ringtonePlaying;
  }

  public onRingtoneStateChange(cb: (playing: boolean) => void): () => void {
    this.ringtoneListeners.add(cb);
    return () => this.ringtoneListeners.delete(cb);
  }

  private emitRingtoneState(playing: boolean) {
    this.ringtonePlaying = playing;
    this.ringtoneListeners.forEach((cb) => cb(playing));
  }

  private playSynthMessagePreset(preset: 'soft_ping' | 'crystal_pop') {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      if (preset === 'soft_ping') {
        const notes = [784, 1046.5]; // G5 -> C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.09);
          gain.gain.setValueAtTime(0.14, now + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.09);
          osc.stop(now + idx * 0.09 + 0.38);
        });
      } else {
        const notes = [659.25, 880, 1318.5]; // E5 -> A5 -> E6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.065);
          gain.gain.setValueAtTime(0.12, now + idx * 0.065);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.065 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.065);
          osc.stop(now + idx * 0.065 + 0.28);
        });
      }
    } catch {
      // safe fail
    }
  }

  /**
   * Plays the user's selected/customized Room GC message notification sound.
   */
  public playRoomNotification() {
    if (this.muted || typeof window === 'undefined') return;

    if (this.messagePreset === 'soft_ping' || this.messagePreset === 'crystal_pop') {
      this.playSynthMessagePreset(this.messagePreset);
      return;
    }

    const url = this.getActiveMessageUrl() || ROOM_NOTIFICATION_SOUND_URL;
    const ctx = this.getContext();
    if (ctx && this.roomNotificationBuffer && this.loadedBufferUrl === url) {
      try {
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        source.buffer = this.roomNotificationBuffer;
        gain.gain.setValueAtTime(0.85, ctx.currentTime);
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);
        return;
      } catch {
        // fallback to HTMLAudioElement below
      }
    }

    if (ctx && this.loadedBufferUrl !== url && !this.bufferLoading) {
      void this.loadNotificationBuffer(ctx, url);
    }

    try {
      const audio =
        this.roomNotificationAudio && this.roomNotificationAudio.src.includes(url)
          ? (this.roomNotificationAudio.cloneNode(true) as HTMLAudioElement)
          : new Audio(url);
      audio.volume = 0.85;
      audio.play().catch(() => {});
    } catch {
      // safe fail if autoplay blocked before user gesture
    }
  }

  private playSynthRingBurst(preset: 'classic_bell' | 'neon_pulse') {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      if (preset === 'classic_bell') {
        // Dual-tone classic ring burst (2 short rings)
        [0, 0.35].forEach((offset) => {
          [440, 480].forEach((freq) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + offset);
            gain.gain.setValueAtTime(0.11, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.28);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 0.3);
          });
        });
      } else {
        // Neon melodic arpeggio burst
        const notes = [523.25, 659.25, 783.99, 1046.5, 783.99];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.11);
          gain.gain.setValueAtTime(0.12, now + idx * 0.11);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.24);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.11);
          osc.stop(now + idx * 0.11 + 0.26);
        });
      }
    } catch {
      // safe fail
    }
  }

  /**
   * Starts looping the Room GC NOTIFICATION CALL ringtone for incoming calls or preview.
   */
  public startCallRingtone(maxDurationMs: number = 25000) {
    if (this.muted || typeof window === 'undefined') return;
    this.stopCallRingtone();

    this.emitRingtoneState(true);

    if (this.callPreset === 'classic_bell' || this.callPreset === 'neon_pulse') {
      const preset = this.callPreset;
      this.playSynthRingBurst(preset);
      this.activeRingtoneInterval = setInterval(() => {
        if (this.muted) {
          this.stopCallRingtone();
          return;
        }
        this.playSynthRingBurst(preset);
      }, 1600);
    } else {
      const url = this.getActiveCallUrl() || CALL_RINGTONE_DEFAULT_URL;
      try {
        const audio = new Audio(url);
        audio.loop = true;
        audio.volume = 0.92;
        this.activeRingtoneAudio = audio;
        audio.play().catch(() => {
          this.emitRingtoneState(false);
        });
      } catch {
        this.emitRingtoneState(false);
      }
    }

    if (maxDurationMs > 0) {
      this.activeRingtoneTimeout = setTimeout(() => {
        this.stopCallRingtone();
      }, maxDurationMs);
    }
  }

  public stopCallRingtone() {
    if (this.activeRingtoneInterval) {
      clearInterval(this.activeRingtoneInterval);
      this.activeRingtoneInterval = null;
    }
    if (this.activeRingtoneTimeout) {
      clearTimeout(this.activeRingtoneTimeout);
      this.activeRingtoneTimeout = null;
    }
    if (this.activeRingtoneAudio) {
      try {
        this.activeRingtoneAudio.pause();
        this.activeRingtoneAudio.currentTime = 0;
      } catch {}
      this.activeRingtoneAudio = null;
    }
    if (this.ringtonePlaying) {
      this.emitRingtoneState(false);
    }
  }

  public playClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // AudioContext safe fail
    }
  }

  public playSuccess() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.07);
        osc.stop(ctx.currentTime + idx * 0.07 + 0.3);
      });
    } catch {
      // safe fail
    }
  }

  public playError() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(190, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // safe fail
    }
  }

  public playPop() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(920, ctx.currentTime + 0.07);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // safe fail
    }
  }
}

export const sounds = new SoundController();
