import pino from 'pino';
import client from 'prom-client';
export declare const logger: pino.Logger<never, boolean>;
export declare const register: client.Registry<"text/plain; version=0.0.4; charset=utf-8">;
export declare const httpRequestsTotal: client.Counter<"method" | "route" | "status_code">;
export declare const activeWebSocketConnections: client.Gauge<string>;
export declare const activeMatchesCount: client.Gauge<string>;
export declare const rejectedCommandsTotal: client.Counter<"reason">;
export declare const desyncEventsTotal: client.Counter<string>;
export declare const matchTickDurationHistogram: client.Histogram<string>;
//# sourceMappingURL=metrics.d.ts.map