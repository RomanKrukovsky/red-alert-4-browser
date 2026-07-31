import { PlayerCommand } from '@ra4/shared-types';
export type CommandValidator = (cmd: PlayerCommand) => {
    valid: boolean;
    reason?: string;
};
export declare class CommandBus {
    private queue;
    private validators;
    registerValidator(validator: CommandValidator): void;
    dispatch(cmd: PlayerCommand): {
        accepted: boolean;
        reason?: string;
    };
    flush(): PlayerCommand[];
    clear(): void;
}
//# sourceMappingURL=commandBus.d.ts.map