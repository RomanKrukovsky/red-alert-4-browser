import { PlayerCommand } from '@ra4/shared-types';

export type CommandValidator = (cmd: PlayerCommand) => { valid: boolean; reason?: string };

export class CommandBus {
  private queue: PlayerCommand[] = [];
  private validators: CommandValidator[] = [];

  public registerValidator(validator: CommandValidator): void {
    this.validators.push(validator);
  }

  public dispatch(cmd: PlayerCommand): { accepted: boolean; reason?: string } {
    for (const v of this.validators) {
      const res = v(cmd);
      if (!res.valid) {
        return { accepted: false, reason: res.reason ?? 'Command rejected by validator' };
      }
    }
    this.queue.push(cmd);
    return { accepted: true };
  }

  public flush(): PlayerCommand[] {
    const cmds = [...this.queue];
    this.queue = [];
    return cmds;
  }

  public clear(): void {
    this.queue = [];
    this.validators = [];
  }
}
