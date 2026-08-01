import { FactionId } from '@ra4/shared-types';

export type FrontendScreen =
  | 'SPLASH'
  | 'MAIN_MENU'
  | 'CAMPAIGN_SELECT'
  | 'FACTION_CAMPAIGN'
  | 'STRATEGIC_MAP'
  | 'BRIEFING'
  | 'TRANSMISSION'
  | 'COMMAND_CENTER'
  | 'SKIRMISH_SETUP'
  | 'LOADING'
  | 'MATCH'
  | 'VICTORY'
  | 'DEFEAT';

export type FactionTheme = 'soviet' | 'allies' | 'coalition' | 'chronolegion';

export interface MatchSetup {
  faction: FactionId;
  opponentFaction: FactionId;
  mapName: string;
  difficulty: 'EASY' | 'NORMAL' | 'HARD';
  startingCredits: number;
  gameSpeed: 'SLOW' | 'NORMAL' | 'FAST';
}

export interface LoadingStage {
  id: string;
  label: string;
  progress: number;
  status: 'pending' | 'active' | 'complete';
}

export const factionThemeById: Record<FactionId, FactionTheme> = {
  [FactionId.USSR]: 'soviet',
  [FactionId.ALLIANCE]: 'allies',
  [FactionId.ORIENTAL_COALITION]: 'coalition',
  [FactionId.CHRONOLEGION]: 'chronolegion',
  [FactionId.NEUTRAL]: 'soviet',
};
