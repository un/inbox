import { AuthError } from "../errors.js";
import type { RequestInternal, ResponseInternal } from "../types.js";
export declare function toInternalRequest(req: Request): Promise<RequestInternal | AuthError>;
export declare function toRequest(request: RequestInternal): Request;
export declare function toResponse(res: ResponseInternal): Response;
/** Web compatible method to create a hash, using SHA256 */
export declare function createHash(message: string): Promise<string>;
/** Web compatible method to create a random string of a given length */
export declare function randomString(size: number): string;
//# sourceMappingURL=web.d.ts.map