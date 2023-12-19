import type { InternalOptions, RequestInternal } from "../../types.js";
/**
 * Starts an e-mail login flow, by generating a token,
 * and sending it to the user's e-mail (with the help of a DB adapter)
 */
export default function email(identifier: string, options: InternalOptions<"email">, request: RequestInternal): Promise<string>;
//# sourceMappingURL=signin.d.ts.map