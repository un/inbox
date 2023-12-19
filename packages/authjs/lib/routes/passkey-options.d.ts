import { PasskeyProviderType } from "src/providers/passkey.js";
import type { InternalOptions, ResponseInternal } from "../../types.js";
import { SessionStore } from "../cookie.js";
import type { PasskeyOptionsReturn } from "../passkey/types.js";
/**
 * Handle passkey options requests by generating authentication or registration options
 * based on the query parameters and the user's credentials.
 *
 * @param request The incoming request.
 * @param options
 * @returns A response with the options and a signed challenge cookie.
 */
export declare function passkeyOptions(options: InternalOptions<PasskeyProviderType>, sessionStore: SessionStore, action?: string, queryEmail?: string): Promise<ResponseInternal<PasskeyOptionsReturn> | ResponseInternal<string>>;
//# sourceMappingURL=passkey-options.d.ts.map