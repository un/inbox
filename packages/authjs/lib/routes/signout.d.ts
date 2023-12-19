import type { InternalOptions, ResponseInternal } from "../../types.js";
import type { SessionStore } from "../cookie.js";
/**
 * Destroys the session.
 * If the session strategy is database,
 * The session is also deleted from the database.
 * In any case, the session cookie is cleared and
 * {@link EventCallbacks.signOut} is emitted.
 */
export declare function signout(sessionStore: SessionStore, options: InternalOptions): Promise<ResponseInternal>;
//# sourceMappingURL=signout.d.ts.map