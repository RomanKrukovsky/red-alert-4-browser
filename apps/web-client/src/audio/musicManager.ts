import { FrontendScreen } from '../ui/types.js';

export interface TrackInfo {
  id: string;
  title: string;
  url: string;
  category: 'menu' | 'battle' | 'ambient' | 'victory' | 'defeat';
}

export const GAME_TRACKS: TrackInfo[] = [
  { id: 'command_overdrive', title: 'Command Overdrive', url: '/assets/audio/music/Command Overdrive.mp3', category: 'menu' },
  { id: 'march_of_steel', title: 'March of Steel', url: '/assets/audio/music/March of Steel.mp3', category: 'battle' },
  { id: 'tesla_overdrive', title: 'Tesla Overdrive', url: '/assets/audio/music/Tesla Overdrive.mp3', category: 'battle' },
  { id: 'red_iron_march', title: 'Red Iron March', url: '/assets/audio/music/Red Iron March.mp3', category: 'battle' },
  { id: 'iron_parade', title: 'Iron Parade', url: '/assets/audio/music/Iron Parade.mp3', category: 'battle' },
  { id: 'red_banner_forge', title: 'Red Banner Forge', url: '/assets/audio/music/Red Banner Forge.mp3', category: 'ambient' },
  { id: 'steel_horizon_pact', title: 'Steel Horizon Pact', url: '/assets/audio/music/Steel Horizon Pact.mp3', category: 'battle' },
];

export class MusicManager {
  private static instance: MusicManager | null = null;
  private audio: HTMLAudioElement | null = null;
  private currentTrack: TrackInfo | null = null;
  private volume: number = 0.5;
  private isMuted: boolean = false;
  private userInteracted: boolean = false;
  private currentCategory: 'menu' | 'battle' | 'ambient' | 'victory' | 'defeat' | null = null;
  private battlePlaylist: TrackInfo[] = [];
  private battleIndex: number = 0;

  private constructor() {
    this.battlePlaylist = GAME_TRACKS.filter((t) => t.category === 'battle');
    this.setupInteractivityListeners();
  }

  public static getInstance(): MusicManager {
    if (!MusicManager.instance) {
      MusicManager.instance = new MusicManager();
    }
    return MusicManager.instance;
  }

  private setupInteractivityListeners(): void {
    const handleFirstInteraction = () => {
      if (!this.userInteracted) {
        this.userInteracted = true;
        if (this.currentTrack && this.audio && this.audio.paused) {
          this.audio.play().catch(() => {});
        }
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('keydown', handleFirstInteraction);
      }
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audio) {
      this.audio.volume = this.isMuted ? 0 : this.volume;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.audio) {
      this.audio.volume = this.isMuted ? 0 : this.volume;
    }
    return this.isMuted;
  }

  public playTrack(track: TrackInfo): void {
    if (this.currentTrack?.id === track.id && this.audio && !this.audio.paused) {
      return;
    }

    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }

    this.currentTrack = track;
    const audio = new Audio(track.url);
    audio.volume = this.isMuted ? 0 : this.volume;
    audio.loop = track.category !== 'battle'; // battle loops or rotates

    audio.onended = () => {
      if (track.category === 'battle') {
        this.playNextBattleTrack();
      }
    };

    this.audio = audio;

    if (this.userInteracted) {
      audio.play().catch((err) => {
        console.warn('Audio playback waiting for user interaction:', err);
      });
    }
  }

  public playNextBattleTrack(): void {
    if (this.battlePlaylist.length === 0) return;
    this.battleIndex = (this.battleIndex + 1) % this.battlePlaylist.length;
    this.playTrack(this.battlePlaylist[this.battleIndex]);
  }

  public handleScreenChange(screen: FrontendScreen): void {
    let targetCategory: 'menu' | 'battle' | 'ambient' = 'menu';

    switch (screen) {
      case 'SPLASH':
      case 'MAIN_MENU':
      case 'CAMPAIGN_SELECT':
      case 'FACTION_CAMPAIGN':
      case 'COMMAND_CENTER':
      case 'SKIRMISH_SETUP':
        targetCategory = 'menu';
        break;
      case 'STRATEGIC_MAP':
      case 'BRIEFING':
      case 'TRANSMISSION':
      case 'LOADING':
        targetCategory = 'ambient';
        break;
      case 'MATCH':
      case 'VICTORY':
      case 'DEFEAT':
        targetCategory = 'battle';
        break;
    }

    if (this.currentCategory === targetCategory && this.audio && !this.audio.paused) {
      return;
    }

    this.currentCategory = targetCategory;

    if (targetCategory === 'menu') {
      const menuTrack = GAME_TRACKS.find((t) => t.id === 'command_overdrive') || GAME_TRACKS[0];
      this.playTrack(menuTrack);
    } else if (targetCategory === 'ambient') {
      const ambientTrack = GAME_TRACKS.find((t) => t.id === 'red_banner_forge') || GAME_TRACKS[0];
      this.playTrack(ambientTrack);
    } else if (targetCategory === 'battle') {
      this.battleIndex = Math.floor(Math.random() * this.battlePlaylist.length);
      this.playTrack(this.battlePlaylist[this.battleIndex]);
    }
  }

  public getCurrentTrack(): TrackInfo | null {
    return this.currentTrack;
  }

  public pause(): void {
    this.audio?.pause();
  }

  public resume(): void {
    if (this.userInteracted && this.audio) {
      this.audio.play().catch(() => {});
    }
  }
}
