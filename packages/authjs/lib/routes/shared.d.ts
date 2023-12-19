import { InternalOptions } from "../../types.js";
export declare function handleAuthorized(params: any, { url, logger, callbacks: { signIn } }: InternalOptions): Promise<{
    status: 403;
    redirect: string;
} | {
    status: 500;
    redirect: string;
} | undefined>;
//# sourceMappingURL=shared.d.ts.map