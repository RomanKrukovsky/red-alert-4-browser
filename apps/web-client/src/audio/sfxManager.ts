/**
 * SFX Manager for synthesizing sound effects using the Web Audio API.
 * Uses a Singleton pattern.
 */

export type SfxType = 
  | 'hover'
  | 'click'
  | 'confirm'
  | 'error'
  | 'buildStart'
  | 'unitReady'
  | 'attackAlert'
  | 'victory'
  | 'defeat';

class SfxManager {
  private static instance: SfxManager;
  private audioCtx: AudioContext | null = null;
  private mainGainNode: GainNode | null = null;
  private masterVolume: number = 1.0;
  private isMuted: boolean = false;
  private lastHoverTime: number = 0;
  
  private readonly HOVER_THROTTLE_MS = 100;

  private constructor() {
    this.setupInteractionListeners();
  }

  /**
   * Returns the singleton instance of SfxManager.
   */
  public static getInstance(): SfxManager {
    if (!SfxManager.instance) {
      SfxManager.instance = new SfxManager();
    }
    return SfxManager.instance;
  }

  /**
   * Sets up listeners for user interaction to lazily initialize the AudioContext.
   */
  private setupInteractionListeners(): void {
    const initAudio = () => {
      this.initAudioContext();
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('click', initAudio, { once: true });
      window.addEventListener('keydown', initAudio, { once: true });
    }
  }

  /**
   * Initializes the AudioContext if it hasn't been initialized yet.
   * Resumes the AudioContext if it is suspended.
   */
  private initAudioContext(): void {
    if (typeof window === 'undefined') return;

    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.mainGainNode = this.audioCtx.createGain();
        this.mainGainNode.connect(this.audioCtx.destination);
        this.updateGain();
      }
    } else if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Updates the main gain node value based on volume and mute state.
   */
  private updateGain(): void {
    if (this.mainGainNode && this.audioCtx) {
      const volume = this.isMuted ? 0 : this.masterVolume;
      this.mainGainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime);
    }
  }

  /**
   * Sets the master volume for all sound effects.
   * @param vol - The volume level (0.0 to 1.0)
   */
  public setVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    this.updateGain();
  }

  /**
   * Toggles the mute state for all sound effects.
   * @returns The new mute state
   */
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.updateGain();
    return this.isMuted;
  }

  /**
   * Plays a specific sound effect type.
   * @param type - The type of sound effect to play
   */
  public playSfx(type: SfxType): void {
    if (type === 'hover') {
      const now = performance.now();
      if (now - this.lastHoverTime < this.HOVER_THROTTLE_MS) {
        return;
      }
      this.lastHoverTime = now;
    }

    this.initAudioContext();

    if (!this.audioCtx || !this.mainGainNode || this.isMuted) {
      return;
    }

    const ctx = this.audioCtx;
    const dest = this.mainGainNode;
    const time = ctx.currentTime;

    switch (type) {
      case 'hover':
        this.playOscillator('sine', 1200, 0.05, time, 0.03, dest);
        break;
      
      case 'click':
        this.playOscillator('square', 800, 0.1, time, 0.05, dest);
        break;

      case 'confirm':
        this.playOscillator('sine', 600, 0.15, time, 0.1, dest);
        this.playOscillator('sine', 900, 0.15, time + 0.1, 0.1, dest);
        break;

      case 'error':
        this.playOscillator('sawtooth', 400, 0.12, time, 0.2, dest, 200);
        break;

      case 'buildStart':
        this.playOscillator('square', 120, 0.1, time, 0.3, dest);
        this.playNoise(0.05, time, 0.3, dest);
        break;

      case 'unitReady':
        this.playOscillator('sine', 440, 0.1, time, 0.08, dest);
        this.playOscillator('sine', 660, 0.1, time + 0.08, 0.08, dest);
        this.playOscillator('sine', 880, 0.1, time + 0.16, 0.08, dest);
        break;

      case 'attackAlert':
        this.playOscillator('sawtooth', 600, 0.1, time, 0.4, dest);
        this.playOscillator('sawtooth', 800, 0.1, time + 0.2, 0.2, dest);
        break;

      case 'victory':
        this.playOscillator('sine', 440, 0.1, time, 0.8, dest, undefined, true);
        this.playOscillator('sine', 550, 0.1, time, 0.8, dest, undefined, true);
        this.playOscillator('sine', 660, 0.1, time, 0.8, dest, undefined, true);
        break;

      case 'defeat':
        this.playOscillator('sine', 440, 0.1, time, 1.0, dest, undefined, true);
        this.playOscillator('sine', 523.25, 0.1, time, 1.0, dest, undefined, true);
        this.playOscillator('sine', 660, 0.1, time, 1.0, dest, undefined, true);
        break;
    }
  }

  /**
   * Helper method to synthesize an oscillator sound.
   */
  private playOscillator(
    type: OscillatorType,
    freqStart: number,
    vol: number,
    startTime: number,
    duration: number,
    destination: GainNode,
    freqEnd?: number,
    fadeout?: boolean
  ): void {
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, startTime);
    if (freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(freqEnd, startTime + duration);
    }

    gain.gain.setValueAtTime(vol, startTime);
    if (fadeout) {
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    } else {
      gain.gain.setValueAtTime(0, startTime + duration);
    }

    osc.connect(gain);
    gain.connect(destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  /**
   * Helper method to synthesize white noise.
   */
  private playNoise(
    vol: number,
    startTime: number,
    duration: number,
    destination: GainNode
  ): void {
    if (!this.audioCtx) return;

    const bufferSize = this.audioCtx.sampleRate * duration;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(vol, startTime);
    
    // Quick fadeout to avoid clicking
    gain.gain.setTargetAtTime(0, startTime + duration - 0.05, 0.015);

    noise.connect(gain);
    gain.connect(destination);

    noise.start(startTime);
    noise.stop(startTime + duration);
  }
}

export const sfxManager = SfxManager.getInstance();
