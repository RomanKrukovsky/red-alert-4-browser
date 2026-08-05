export declare class UIAuditor {
    private prefix;
    private browser;
    private targetUrl;
    private artifactsDir;
    constructor(prefix?: 'before' | 'after');
    runAudit(): Promise<void>;
}
