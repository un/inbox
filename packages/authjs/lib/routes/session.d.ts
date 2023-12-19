import type { InternalOptions, ResponseInternal, Session } from "../../types.js";
import type { SessionStore } from "../cookie.js";
/** Return a session object filtered via `callbacks.session` */
export declare function session(params: {
    options: InternalOptions;
    sessionStore: SessionStore;
    isUpdate?: boolean;
    newSession?: any;
}): Promise<ResponseInternal<Session | null>>;
//# sourceMappingURL=session.d.ts.map