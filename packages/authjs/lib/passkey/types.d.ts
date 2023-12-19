import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/server/script/deps";
export type AuthenticateOption = "authenticate";
export type RegisterOption = "register";
export type PasskeyOptionsAction = AuthenticateOption | RegisterOption;
export type PasskeyOptionsReturn<T extends PasskeyOptionsAction = PasskeyOptionsAction> = T extends AuthenticateOption ? {
    options: PublicKeyCredentialRequestOptionsJSON;
    action: AuthenticateOption;
} : T extends RegisterOption ? {
    options: PublicKeyCredentialCreationOptionsJSON;
    action: RegisterOption;
} : never;
export type PasskeyOptionsQuery = {
    action: string;
    email?: string;
};
export type PasskeyOptionsCookieData = {
    challenge: string;
    providerAccountId?: string;
};
//# sourceMappingURL=types.d.ts.map