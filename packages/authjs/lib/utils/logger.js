const red = "\x1b[31m";
const yellow = "\x1b[33m";
const grey = "\x1b[90m";
const reset = "\x1b[0m";
export const logger = {
    error(error) {
        const url = `https://errors.authjs.dev#${error.name.toLowerCase()}`;
        console.error(`${red}[auth][error][${error.name}]${reset}:${error.message ? ` ${error.message}.` : ""} Read more at ${url}`);
        if (error.cause) {
            const { err, ...data } = error.cause;
            console.error(`${red}[auth][cause]${reset}:`, err.stack);
            console.error(`${red}[auth][details]${reset}:`, JSON.stringify(data, null, 2));
        }
        else if (error.stack) {
            console.error(error.stack.replace(/.*/, "").substring(1));
        }
    },
    warn(code) {
        const url = `https://warnings.authjs.dev#${code}`;
        console.warn(`${yellow}[auth][warn][${code}]${reset}`, `Read more: ${url}`);
    },
    debug(message, metadata) {
        console.log(`${grey}[auth][debug]:${reset} ${message}`, JSON.stringify(metadata, null, 2));
    },
};
/**
 * Override the built-in logger with user's implementation.
 * Any `undefined` level will use the default logger.
 */
export function setLogger(newLogger = {}, debug) {
    // Turn off debug logging if `debug` isn't set to `true`
    if (!debug)
        logger.debug = () => { };
    if (newLogger.error)
        logger.error = newLogger.error;
    if (newLogger.warn)
        logger.warn = newLogger.warn;
    if (newLogger.debug)
        logger.debug = newLogger.debug;
}
