import { useUIStore } from '@ra4/ui';

export type UnitVoiceEvent = 'Selected' | 'Move' | 'Attack' | 'Ability' | 'Damaged' | 'Death' | 'Elite' | 'Idle';

export type EVACallout =
  | 'MATCH_START'
  | 'BUILDING_STARTED'
  | 'BUILDING_COMPLETE'
  | 'UNIT_READY'
  | 'LOW_POWER'
  | 'BASE_UNDER_ATTACK'
  | 'UNIT_LOST'
  | 'VICTORY'
  | 'DEFEAT'
  | 'ORDER_ISSUED'
  | 'DIRECT_CONTROL';

const STABLE_ID_MAP: Record<string, string> = {
  // Direct matches
  SU_RubezhRifleman: 'SU_RubezhRifleman',
  SU_ZapalGrenadier: 'SU_ZapalGrenadier',
  SU_ZaslonAATeam: 'SU_ZaslonAATeam',
  SU_MasterEngineer: 'SU_MasterEngineer',
  SU_RazryadTrooper: 'SU_RazryadTrooper',
  SU_VektorOfficer: 'SU_VektorOfficer',
  SU_Hero_Morozova: 'SU_Hero_Morozova',
  SU_GranitMBT: 'SU_GranitMBT',
  SU_BogatyrOreCarrier: 'SU_BogatyrOreCarrier',
  SU_RysScout: 'SU_RysScout',
  SU_GromoboyRam: 'SU_GromoboyRam',
  SU_VoevodaHeavyTank: 'SU_VoevodaHeavyTank',
  SU_ZarevoMLRS: 'SU_ZarevoMLRS',
  SU_KrechetInterceptor: 'SU_KrechetInterceptor',
  SU_KorshunGunship: 'SU_KorshunGunship',
  SU_GromadaAirship: 'SU_GromadaAirship',
  SU_BuranPatrolBoat: 'SU_BuranPatrolBoat',
  SU_MorokSubmarine: 'SU_MorokSubmarine',
  SU_SvyatogorCruiser: 'SU_SvyatogorCruiser',

  // Aliases / Fallbacks
  SU_Conscript: 'SU_RubezhRifleman',
  SU_FlakTrooper: 'SU_ZaslonAATeam',
  SU_Engineer: 'SU_MasterEngineer',
  SU_Grenadier: 'SU_ZapalGrenadier',
  SU_TeslaTrooper: 'SU_RazryadTrooper',
  SU_Officer: 'SU_VektorOfficer',
  SU_Morozova: 'SU_Hero_Morozova',
  SU_Tank: 'SU_GranitMBT',
  SU_Harvester: 'SU_BogatyrOreCarrier',
  SU_Scout: 'SU_RysScout',
  SU_Ram: 'SU_GromoboyRam',
  SU_Apocalypse: 'SU_VoevodaHeavyTank',
  SU_V2Rocket: 'SU_ZarevoMLRS',
  SU_Mig: 'SU_KrechetInterceptor',
  SU_Hind: 'SU_KorshunGunship',
  SU_Kirov: 'SU_GromadaAirship',
  SU_PatrolBoat: 'SU_BuranPatrolBoat',
  SU_Submarine: 'SU_MorokSubmarine',
  SU_Dreadnought: 'SU_SvyatogorCruiser',
};

const EVA_MESSAGES: Record<EVACallout, { text: string; type: 'INFO' | 'WARN' | 'DANGER' }> = {
  MATCH_START: { text: 'Командная сеть развёрнута. Ожидание приказов.', type: 'INFO' },
  BUILDING_STARTED: { text: 'Строительство начато.', type: 'INFO' },
  BUILDING_COMPLETE: { text: 'Строительство завершено.', type: 'INFO' },
  UNIT_READY: { text: 'Юнит готов.', type: 'INFO' },
  LOW_POWER: { text: 'Внимание: низкий уровень энергии!', type: 'WARN' },
  BASE_UNDER_ATTACK: { text: 'Внимание! Наша база атакована!', type: 'DANGER' },
  UNIT_LOST: { text: 'Юнит потерян.', type: 'WARN' },
  VICTORY: { text: 'Победа! Противник повержен.', type: 'INFO' },
  DEFEAT: { text: 'Поражение! Командный пункт уничтожен.', type: 'DANGER' },
  ORDER_ISSUED: { text: 'Приказ принят.', type: 'INFO' },
  DIRECT_CONTROL: { text: 'Прямое управление юнитом активировано.', type: 'INFO' },
};

export class VoiceManager {
  private static instance: VoiceManager | null = null;

  private currentAudio: HTMLAudioElement | null = null;
  private volume: number = 0.8;
  private isMuted: boolean = false;

  private lastBarkTime: number = 0;
  private lastEvaTime: Record<string, number> = {};
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  private audioCtx: AudioContext | null = null;

  private constructor() {
    // Lazy AudioContext initialization on first user interaction
    const initCtx = () => {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      window.removeEventListener('click', initCtx);
      window.removeEventListener('keydown', initCtx);
    };
    window.addEventListener('click', initCtx);
    window.addEventListener('keydown', initCtx);
  }

  public static getInstance(): VoiceManager {
    if (!VoiceManager.instance) {
      VoiceManager.instance = new VoiceManager();
    }
    return VoiceManager.instance;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.currentAudio) {
      this.currentAudio.volume = this.isMuted ? 0 : this.volume;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.currentAudio) {
      this.currentAudio.volume = this.isMuted ? 0 : this.volume;
    }
    return this.isMuted;
  }

  /**
   * Play a unit voice line bark.
   * Debounced so rapid selection/clicks play 1 clean voice bark instead of overlapping audio.
   */
  public playUnitBark(unitTypeId: string | undefined, event: UnitVoiceEvent, force: boolean = false): void {
    if (this.isMuted) return;
    if (!unitTypeId) return;

    const now = Date.now();
    // Cooldown between unit barks (600ms) unless forced
    if (!force && now - this.lastBarkTime < 600 && event !== 'Death') {
      return;
    }

    const stableId = STABLE_ID_MAP[unitTypeId] || STABLE_ID_MAP['SU_RubezhRifleman'];
    const pathMp3 = `/assets/audio/voice/VO_RU_${stableId}_${event}_01.mp3`;
    const pathOgg = `/assets/audio/voice/VO_RU_${stableId}_${event}_01.ogg`;

    this.lastBarkTime = now;
    this.playAudioFile(pathMp3, pathOgg);
  }

  /**
   * Play an EVA tactical announcement.
   * Includes synthesized radio chime beep + SpeechSynthesis TTS + Zustand EVA log line.
   */
  public playEVAMessage(callout: EVACallout, customMsg?: string, cooldownMs: number = 3000): void {
    const now = Date.now();
    const lastTime = this.lastEvaTime[callout] || 0;

    if (now - lastTime < cooldownMs) {
      return;
    }
    this.lastEvaTime[callout] = now;

    const meta = EVA_MESSAGES[callout];
    const textToSpeak = customMsg || meta.text;

    // 1. Add log to Zustand Store
    useUIStore.getState().addEvaLog(`[EVA] ${textToSpeak}`, meta.type);

    if (this.isMuted) return;

    // 2. Play tactical radio chime SFX
    this.playEvaChime();

    // 3. Spoken Voice Line via Web Speech API or Fallback
    this.speakText(textToSpeak);
  }

  private playAudioFile(primaryUrl: string, fallbackUrl?: string): void {
    try {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
      }

      let audio = this.audioCache.get(primaryUrl);
      if (!audio) {
        audio = new Audio(primaryUrl);
        this.audioCache.set(primaryUrl, audio);
      } else {
        audio.currentTime = 0;
      }

      audio.volume = this.isMuted ? 0 : this.volume;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          if (fallbackUrl) {
            const fallbackAudio = new Audio(fallbackUrl);
            fallbackAudio.volume = this.isMuted ? 0 : this.volume;
            fallbackAudio.play().catch(() => {});
          }
        });
      }

      this.currentAudio = audio;
    } catch (e) {
      console.warn('VoiceManager playAudioFile error:', e);
    }
  }

  private playEvaChime(): void {
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        if (this.audioCtx.state === 'suspended') {
          void this.audioCtx.resume();
        }

        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);

        gain.gain.setValueAtTime(this.volume * 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch {
      // AudioContext unavailable
    }
  }

  private speakText(text: string): void {
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // cancel ongoing speech

      const cleanText = text.replace(/\[.*?\]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'ru-RU';
      utterance.pitch = 1.08; // slightly higher tactical voice
      utterance.rate = 1.05; // slightly faster rate
      utterance.volume = this.volume;

      // Try to find a Russian female or default Russian voice
      const voices = window.speechSynthesis.getVoices();
      const ruVoice = voices.find((v) => v.lang.startsWith('ru') && (v.name.includes('Female') || v.name.includes('Tatyana') || v.name.includes('Milena') || v.name.includes('Russian')));
      if (ruVoice) {
        utterance.voice = ruVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('EVA TTS error:', e);
    }
  }
}
