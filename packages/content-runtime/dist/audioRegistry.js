export const AUDIO_REGISTRY = [
    // EVA Announcer
    { id: 'eva_match_start', name: 'EVA: Сражение началось', category: 'EVA', urlOgg: '/assets/audio/voice/EVA_MatchStart.ogg', urlMp3: '/assets/audio/voice/EVA_MatchStart.mp3' },
    { id: 'eva_building_complete', name: 'EVA: Строительство завершено', category: 'EVA', urlOgg: '/assets/audio/voice/EVA_BuildingComplete.ogg', urlMp3: '/assets/audio/voice/EVA_BuildingComplete.mp3' },
    { id: 'eva_unit_ready', name: 'EVA: Юнит готов', category: 'EVA', urlOgg: '/assets/audio/voice/EVA_UnitReady.ogg', urlMp3: '/assets/audio/voice/EVA_UnitReady.mp3' },
    { id: 'eva_base_under_attack', name: 'EVA: Внимание, база под атакой!', category: 'EVA', urlOgg: '/assets/audio/voice/EVA_BaseUnderAttack.ogg', urlMp3: '/assets/audio/voice/EVA_BaseUnderAttack.mp3' },
    { id: 'eva_insufficient_funds', name: 'EVA: Недостаточно средств', category: 'EVA', urlOgg: '/assets/audio/voice/EVA_InsufficientFunds.ogg', urlMp3: '/assets/audio/voice/EVA_InsufficientFunds.mp3' },
    // Soviet Voice Barks
    { id: 'vo_su_granit_selected', name: 'Советский Танк Гранит: Выбор', category: 'VOICE', factionId: 'USSR', urlOgg: '/assets/audio/voice/VO_RU_SU_GranitMBT_Selected_01.ogg', urlMp3: '/assets/audio/voice/VO_RU_SU_GranitMBT_Selected_01.mp3' },
    { id: 'vo_su_granit_move', name: 'Советский Танк Гранит: Движение', category: 'VOICE', factionId: 'USSR', urlOgg: '/assets/audio/voice/VO_RU_SU_GranitMBT_Move_01.ogg', urlMp3: '/assets/audio/voice/VO_RU_SU_GranitMBT_Move_01.mp3' },
    { id: 'vo_su_granit_attack', name: 'Советский Танк Гранит: Огонь', category: 'VOICE', factionId: 'USSR', urlOgg: '/assets/audio/voice/VO_RU_SU_GranitMBT_Attack_01.ogg', urlMp3: '/assets/audio/voice/VO_RU_SU_GranitMBT_Attack_01.mp3' },
    { id: 'vo_su_bogatyr_selected', name: 'Советский Комбайн Богатырь: Выбор', category: 'VOICE', factionId: 'USSR', urlOgg: '/assets/audio/voice/VO_RU_SU_BogatyrOreCarrier_Selected_01.ogg', urlMp3: '/assets/audio/voice/VO_RU_SU_BogatyrOreCarrier_Selected_01.mp3' },
    { id: 'vo_su_rubezh_selected', name: 'Стрелок Рубеж: Выбор', category: 'VOICE', factionId: 'USSR', urlOgg: '/assets/audio/voice/VO_RU_SU_RubezhRifleman_Selected_01.ogg', urlMp3: '/assets/audio/voice/VO_RU_SU_RubezhRifleman_Selected_01.mp3' },
    // Alliance Voice Barks
    { id: 'vo_al_bulwark_selected', name: 'Танк Бастион Альянса: Выбор', category: 'VOICE', factionId: 'ALLIANCE', urlOgg: '/assets/audio/voice/VO_RU_AL_BulwarkMBT_Selected_01.ogg', urlMp3: '/assets/audio/voice/VO_RU_AL_BulwarkMBT_Selected_01.mp3' },
    { id: 'vo_al_chrono_collector_selected', name: 'Хроно-Сборщик: Выбор', category: 'VOICE', factionId: 'ALLIANCE', urlOgg: '/assets/audio/voice/VO_RU_AL_ChronoCollector_Selected_01.ogg', urlMp3: '/assets/audio/voice/VO_RU_AL_ChronoCollector_Selected_01.mp3' },
    // Music Tracks
    { id: 'music_main_theme', name: 'Red Alert 4 Main Theme', category: 'MUSIC', urlOgg: '/assets/audio/music/RA4_MainMenu_Theme.ogg', urlMp3: '/assets/audio/music/RA4_MainMenu_Theme.mp3' }
];
export class AudioRegistry {
    static instance;
    entries = new Map();
    constructor() {
        AUDIO_REGISTRY.forEach(entry => this.entries.set(entry.id, entry));
    }
    static getInstance() {
        if (!AudioRegistry.instance) {
            AudioRegistry.instance = new AudioRegistry();
        }
        return AudioRegistry.instance;
    }
    get(id) {
        return this.entries.get(id);
    }
    getAll() {
        return Array.from(this.entries.values());
    }
}
//# sourceMappingURL=audioRegistry.js.map