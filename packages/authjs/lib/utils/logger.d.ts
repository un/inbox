import { AuthError } from "../../errors.js";
export type WarningCode = "debug-enabled" | "csrf-disabled";
/**
 * Override any of the methods, and the rest will use the default logger.
 *
 * [Documentation](https://authjs.dev/reference/configuration/auth-config#logger)
 */
export interface LoggerInstance extends Record<string, Function> {
    warn: (code: WarningCode) => void;
    error: (error: AuthError) => void;
    debug: (message: string, metadata?: unknown) => void;
}
export declare const logger: LoggerInstance;
/**
 * Override the built-in logger with user's implementation.
 * Any `undefined` level will use the default logger.
 */
export declare function setLogger(newLogger?: Partial<LoggerInstance>, debug?: boolean): void;
//# sourceMappingURL=logger.d.ts.map