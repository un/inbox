export const DEFAULT_PASSKEY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
export default function Passkey(config) {
    return {
        id: "passkey",
        name: "Passkey",
        timeout: DEFAULT_PASSKEY_TIMEOUT,
        ...config,
        type: "passkey",
    };
}
