import { generateAuthenticationOptions, generateRegistrationOptions, } from "@simplewebauthn/server";
import { randomString } from "../web.js";
import { MissingAdapter } from "../../errors.js";
async function getUserAndAuthenticators(options, email) {
    const { adapter, provider } = options;
    // Validate that the adapter is defined and implements the required methods
    if (!adapter)
        throw new MissingAdapter("Passkey provider requires an adapter.");
    // Get the full user from the email
    const user = email ? await adapter.getUserByEmail(email) : null;
    // Find the user's account associated with the provider
    const accounts = user ? (await adapter.listLinkedAccounts(user.id)) ?? [] : [];
    const account = accounts.find((a) => a.provider === provider.id) ?? null;
    // Find the account's authenticators
    const authenticators = account
        ? (await adapter.listAuthenticatorsByAccountId(account.providerAccountId)) ?? undefined
        : undefined;
    return [authenticators, user, account];
}
/**
 * Generate passkey authentication options.
 * If a user is provided, their credentials will be used to generate the options.
 * Otherwise, allow any credentials.
 *
 * @param options
 * @param email Optional user email to use to generate the options.
 * @returns The options prepared for the client.
 */
export async function authenticationOptions(options, email) {
    const { provider } = options;
    // Get the user's authenticators
    const [authenticators] = await getUserAndAuthenticators(options, email);
    // Generate authentication options
    const authOptions = await generateAuthenticationOptions({
        rpID: provider.relayingParty.id,
        timeout: provider.timeout,
        allowCredentials: authenticators?.map((a) => ({
            id: a.credentialID,
            type: "public-key",
            transports: a.transports,
        })),
        userVerification: "preferred",
    });
    return authOptions;
}
/**
 * Generate passkey registration options.
 * If a user is provided, their credentials will be used to generate the options.
 * Otherwise, their email will be used to generate the options.
 *
 * @param options
 * @param email The user's email to use to generate the options.
 * @returns The options prepared for the client.
 */
export async function registrationOptions(options, email) {
    const { provider } = options;
    // Get the user authenticators and user object
    const [authenticators, user, account] = await getUserAndAuthenticators(options, email);
    // Generate a random acc ID and user name if the user does not exist
    const accountProviderID = account?.providerAccountId ?? randomString(32);
    const userName = user?.name ?? user?.email ?? email;
    const userDisplayName = user?.name ?? userName;
    // Generate registration options
    const regOptions = await generateRegistrationOptions({
        userID: accountProviderID,
        userName,
        userDisplayName,
        rpID: provider.relayingParty.id,
        rpName: provider.relayingParty.name,
        timeout: provider.timeout,
        excludeCredentials: authenticators?.map((a) => ({
            id: a.credentialID,
            type: "public-key",
            transports: a.transports,
        })),
        authenticatorSelection: {
            residentKey: "required",
            userVerification: "preferred",
        },
    });
    return regOptions;
}
