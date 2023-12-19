import type { InternalOptions, RequestInternal, ResponseInternal } from "../../types.js";
import type { SessionStore } from "../cookie.js";
/** Handle callbacks from login services */
export declare function callback(params: {
    options: InternalOptions;
    query: RequestInternal["query"];
    method: Required<RequestInternal>["method"];
    body: RequestInternal["body"];
    headers: RequestInternal["headers"];
    cookies: RequestInternal["cookies"];
    sessionStore: SessionStore;
}): Promise<ResponseInternal>;
//# sourceMappingURL=callback.d.ts.map