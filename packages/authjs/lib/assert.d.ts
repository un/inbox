import { InvalidCallbackUrl, InvalidEndpoints, MissingAdapter, MissingAdapterMethods, MissingAuthorize, MissingSecret, UnsupportedStrategy, MultiplePasskeyAccountsError } from "../errors.js";
import type { AuthConfig, RequestInternal } from "../types.js";
import type { WarningCode } from "./utils/logger.js";
type ConfigError = InvalidCallbackUrl | InvalidEndpoints | MissingAdapter | MissingAdapterMethods | MissingAuthorize | MissingSecret | UnsupportedStrategy | MultiplePasskeyAccountsError;
/**
 * Verify that the user configured Auth.js correctly.
 * Good place to mention deprecations as well.
 *
 * This is invoked before the init method, so default values are not available yet.
 */
export declare function assertConfig(request: RequestInternal, options: AuthConfig): ConfigError | WarningCode[];
export {};
//# sourceMappingURL=assert.d.ts.map