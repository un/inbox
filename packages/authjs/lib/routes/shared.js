import { AuthorizedCallbackError } from "../../errors.js";
export async function handleAuthorized(params, { url, logger, callbacks: { signIn } }) {
    try {
        const authorized = await signIn(params);
        if (!authorized) {
            url.pathname += "/error";
            logger.debug("User not authorized", params);
            url.searchParams.set("error", "AccessDenied");
            return { status: 403, redirect: url.toString() };
        }
    }
    catch (e) {
        url.pathname += "/error";
        const error = new AuthorizedCallbackError(e);
        logger.error(error);
        url.searchParams.set("error", "Configuration");
        return { status: 500, redirect: url.toString() };
    }
}
