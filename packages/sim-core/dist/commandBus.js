export class CommandBus {
    queue = [];
    validators = [];
    registerValidator(validator) {
        this.validators.push(validator);
    }
    dispatch(cmd) {
        for (const v of this.validators) {
            const res = v(cmd);
            if (!res.valid) {
                return { accepted: false, reason: res.reason ?? 'Command rejected by validator' };
            }
        }
        this.queue.push(cmd);
        return { accepted: true };
    }
    flush() {
        const cmds = [...this.queue];
        this.queue = [];
        return cmds;
    }
    clear() {
        this.queue = [];
        this.validators = [];
    }
}
//# sourceMappingURL=commandBus.js.map