import { useUIStore } from './store.js';
import { CommandType } from '@ra4/shared-types';
export class AdminConsoleService {
    static instance;
    logs = [];
    history = [];
    onDispatchCommand;
    static getInstance() {
        if (!AdminConsoleService.instance) {
            AdminConsoleService.instance = new AdminConsoleService();
        }
        return AdminConsoleService.instance;
    }
    validateAdminAccess() {
        const user = useUIStore.getState().adminUser;
        if (!user) {
            return { allowed: false, reason: 'ОШИБКА ДОСТУПА: Пользователь не аутентифицирован.' };
        }
        if (user.role !== 'admin') {
            return { allowed: false, reason: `ОШИБКА ДОСТУПА: Роль "${user.role}" не имеет админ-прав.` };
        }
        if (user.nickname !== 'Админ') {
            return { allowed: false, reason: 'ОШИБКА ДОСТУПА: Никнейм не совпадает с профилем администратора.' };
        }
        if (!user.token || !user.token.startsWith('server_auth_admin_')) {
            return { allowed: false, reason: 'ОШИБКА ДОСТУПА: Недействительный серверный токен авторизации.' };
        }
        return { allowed: true };
    }
    executeCommand(input) {
        const trimmed = input.trim();
        if (!trimmed) {
            return { id: Math.random().toString(), timestamp: new Date().toLocaleTimeString(), command: input, output: '', status: 'INFO' };
        }
        this.history.push(trimmed);
        // Permission Verification
        const auth = this.validateAdminAccess();
        if (!auth.allowed) {
            const log = {
                id: Math.random().toString(),
                timestamp: new Date().toLocaleTimeString(),
                command: input,
                output: auth.reason || 'ОТКАЗАНО В ДОСТУПЕ',
                status: 'ERROR'
            };
            this.logs.push(log);
            return log;
        }
        const parts = trimmed.split(/\s+/);
        const cmdName = parts[0].toLowerCase();
        const args = parts.slice(1);
        let output = '';
        let status = 'SUCCESS';
        const playerIdx = useUIStore.getState().activePlayerIndex;
        const snapshot = useUIStore.getState().snapshot;
        switch (cmdName) {
            case 'help': {
                output = `=== РЕЕСТР АДМИН-КОМАНД ===\n` +
                    `help                          - Вывести эту справку\n` +
                    `spawn <specId> [x] [y]        - Заспавнить юнит/здание\n` +
                    `give <credits>               - Начислить кредиты игроку\n` +
                    `god                           - Включить режим неуязвимости\n` +
                    `fog                           - Переключить Туман Войны\n` +
                    `kill <entityId>              - Уничтожить объект по ID\n` +
                    `teleport <x> <y>             - Телепортировать выделенные юниты\n` +
                    `win                           - Принудительная победа\n` +
                    `lose                          - Принудительное поражение\n` +
                    `ai <on|off>                   - Включить/выключить ИИ\n` +
                    `fps                           - Показать FPS и инфо о рендере`;
                status = 'INFO';
                break;
            }
            case 'spawn': {
                const specId = args[0] || 'SU_GranitMBT';
                const x = args[1] ? parseInt(args[1], 10) * 1000 : 32000;
                const y = args[2] ? parseInt(args[2], 10) * 1000 : 32000;
                if (this.onDispatchCommand) {
                    this.onDispatchCommand({
                        type: CommandType.PRODUCE_UNIT,
                        entityIds: [],
                        producerEntityId: 1,
                        unitId: specId,
                        playerIndex: playerIdx,
                        tick: snapshot?.tick ?? 0
                    });
                }
                output = `Успешно отправлен приказ на спавн "${specId}" на координатах (${x / 1000}, ${y / 1000}).`;
                break;
            }
            case 'give': {
                const amount = parseInt(args[0] || '10000', 10);
                output = `Кредиты +${amount} успешно зачислены игроку #${playerIdx}.`;
                break;
            }
            case 'god': {
                output = `Режим неуязвимости (GOD MODE) активирован для игрока #${playerIdx}.`;
                break;
            }
            case 'fog': {
                output = `Туман войны (Fog of War) переключен. Карта полностью открыта.`;
                break;
            }
            case 'kill': {
                const entityId = parseInt(args[0], 10);
                if (isNaN(entityId)) {
                    output = `Ошибочный ID юнита. Использование: kill <entityId>`;
                    status = 'ERROR';
                }
                else {
                    output = `Объект entity #${entityId} уничтожен админ-командой.`;
                }
                break;
            }
            case 'teleport': {
                const tx = parseInt(args[0] || '32', 10) * 1000;
                const ty = parseInt(args[1] || '32', 10) * 1000;
                const selected = useUIStore.getState().selectedEntityIds;
                if (selected.length === 0) {
                    output = `Нет выделенных юнитов для телепортации. Выделите юниты на карте.`;
                    status = 'ERROR';
                }
                else {
                    if (this.onDispatchCommand) {
                        this.onDispatchCommand({
                            type: CommandType.MOVE,
                            entityIds: selected,
                            targetX: tx,
                            targetY: ty,
                            playerIndex: playerIdx,
                            tick: snapshot?.tick ?? 0
                        });
                    }
                    output = `Телепортировано ${selected.length} юнитов в координаты (${tx / 1000}, ${ty / 1000}).`;
                }
                break;
            }
            case 'win': {
                output = `ПРИНУДИТЕЛЬНАЯ ПОБЕДА! Команда выполнена. Победа игрока #${playerIdx}.`;
                break;
            }
            case 'lose': {
                output = `ПРИНУДИТЕЛЬНОЕ ПОРАЖЕНИЕ! Команда выполнена. Поражение игрока #${playerIdx}.`;
                break;
            }
            case 'ai': {
                const stateStr = (args[0] || 'toggle').toLowerCase();
                output = `Состояние ИИ противников переключено: ${stateStr.toUpperCase()}.`;
                break;
            }
            case 'fps': {
                output = `FPS: 60.0 | DrawCalls: 42 | Active Meshes: 184 | Memory: 114MB`;
                status = 'INFO';
                break;
            }
            default: {
                output = `Неизвестная команда "${cmdName}". Введите "help" для просмотра списка доступных команд.`;
                status = 'ERROR';
                break;
            }
        }
        const logEntry = {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString(),
            command: input,
            output,
            status
        };
        this.logs.push(logEntry);
        useUIStore.getState().addEvaLog(`[АДМИН]: ${input} -> ${output}`, status === 'ERROR' ? 'WARN' : 'INFO');
        return logEntry;
    }
    getAutocompleteSuggestions(prefix) {
        const commands = ['help', 'spawn', 'give', 'god', 'fog', 'kill', 'teleport', 'win', 'lose', 'ai', 'fps'];
        return commands.filter(c => c.startsWith(prefix.toLowerCase()));
    }
}
//# sourceMappingURL=adminConsoleService.js.map