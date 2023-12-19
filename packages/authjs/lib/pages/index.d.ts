import type { ErrorPageParam, InternalOptions, RequestInternal, ResponseInternal } from "../../types.js";
import type { Cookie } from "../cookie.js";
type RenderPageParams = {
    query?: RequestInternal["query"];
    cookies?: Cookie[];
} & Partial<Pick<InternalOptions, "url" | "callbackUrl" | "csrfToken" | "providers" | "theme">>;
/**
 * Unless the user defines their [own pages](https://authjs.dev/guides/basics/pages),
 * we render a set of default ones, using Preact SSR.
 */
export default function renderPage(params: RenderPageParams): {
    signin(props?: any): ResponseInternal<any>;
    signout(props?: any): ResponseInternal<any>;
    verifyRequest(props?: any): ResponseInternal<any>;
    error(props?: {
        error?: ErrorPageParam;
    }): ResponseInternal<any>;
};
export {};
//# sourceMappingURL=index.d.ts.map