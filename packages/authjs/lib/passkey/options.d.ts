import type { InternalOptions } from "../../types.js";
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/server/script/deps";
import type { PasskeyProviderType } from "../../providers/passkey.js";
/**
 * Generate passkey authentication options.
 * If a user is provided, their credentials will be used to generate the options.
 * Otherwise, allow any credentials.
 *
 * @param options
 * @param email Optional user email to use to generate the options.
 * @returns The options prepared for the client.
 */
export declare function authenticationOptions(options: InternalOptions<PasskeyProviderType>, email?: string): Promise<PublicKeyCredentialRequestOptionsJSON>;
/**
 * Generate passkey registration options.
 * If a user is provided, their credentials will be used to generate the options.
 * Otherwise, their email will be used to generate the options.
 *
 * @param options
 * @param email The user's email to use to generate the options.
 * @returns The options prepared for the client.
 */
export declare function registrationOptions(options: InternalOptions<PasskeyProviderType>, email: string): Promise<PublicKeyCredentialCreationOptionsJSON>;
//# sourceMappingURL=options.d.ts.map