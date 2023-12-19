/** @typedef {import("./types").PasskeyOptionsAction} PasskeyOptionsAction */
/**
 * @template {PasskeyOptionsAction} T
 * @typedef {import("./types").PasskeyOptionsReturn<T>} PasskeyOptionsReturn
 */
/**
 * passkeyScript is the client-side script that handles the passkey form
 *
 * @param {string} baseURL is the base URL of the auth API
 */
export function passkeyScript(baseURL: string): Promise<void>;
export type PasskeyOptionsAction = import("./types").PasskeyOptionsAction;
export type PasskeyOptionsReturn<T extends import("./types").PasskeyOptionsAction> = import("./types").PasskeyOptionsReturn<T>;
//# sourceMappingURL=browser-script.d.ts.map