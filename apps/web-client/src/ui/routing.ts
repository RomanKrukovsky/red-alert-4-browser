import { FactionId } from '@ra4/shared-types';
import { FrontendScreen } from './types.js';

export const screenByHash: Record<string, FrontendScreen> = {
  '#/splash': 'SPLASH',
  '#/menu': 'MAIN_MENU',
  '#/campaign': 'CAMPAIGN_SELECT',
  '#/campaign/soviet': 'FACTION_CAMPAIGN',
  '#/campaign/allies': 'FACTION_CAMPAIGN',
  '#/campaign/coalition': 'FACTION_CAMPAIGN',
  '#/campaign/chronolegion': 'FACTION_CAMPAIGN',
  '#/strategic-map': 'STRATEGIC_MAP',
  '#/briefing': 'BRIEFING',
  '#/transmission': 'TRANSMISSION',
  '#/allied-command': 'COMMAND_CENTER',
  '#/coalition-command': 'COMMAND_CENTER',
  '#/skirmish': 'SKIRMISH_SETUP',
  '#/loading': 'LOADING',
  '#/victory': 'VICTORY',
  '#/defeat': 'DEFEAT',
  '#/hud/soviet': 'MATCH',
  '#/hud/allies': 'MATCH',
  '#/hud/coalition': 'MATCH',
  '#/hud/chronolegion': 'MATCH',
};

export const factionByHash: Partial<Record<string, FactionId>> = {
  '#/campaign/soviet': FactionId.USSR,
  '#/campaign/allies': FactionId.ALLIANCE,
  '#/campaign/coalition': FactionId.ORIENTAL_COALITION,
  '#/campaign/chronolegion': FactionId.CHRONOLEGION,
  '#/allied-command': FactionId.ALLIANCE,
  '#/coalition-command': FactionId.ORIENTAL_COALITION,
  '#/hud/soviet': FactionId.USSR,
  '#/hud/allies': FactionId.ALLIANCE,
  '#/hud/coalition': FactionId.ORIENTAL_COALITION,
  '#/hud/chronolegion': FactionId.CHRONOLEGION,
};

export const resolveScreen = (hash: string): FrontendScreen => screenByHash[hash] ?? 'SPLASH';
