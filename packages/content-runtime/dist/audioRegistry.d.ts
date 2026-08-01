export interface AudioEntry {
    id: string;
    name: string;
    category: 'VOICE' | 'EVA' | 'SFX' | 'MUSIC';
    factionId?: string;
    urlOgg: string;
    urlMp3: string;
}
export declare const AUDIO_REGISTRY: AudioEntry[];
export declare class AudioRegistry {
    private static instance;
    private entries;
    constructor();
    static getInstance(): AudioRegistry;
    get(id: string): AudioEntry | undefined;
    getAll(): AudioEntry[];
}
//# sourceMappingURL=audioRegistry.d.ts.map