export const host = process.env.REALTIME_HOST || '';
export const port = process.env.REALTIME_PORT || '';
export const appId = process.env.REALTIME_APP_ID || '';
export const appKey = process.env.REALTIME_APP_KEY || '';
export const appSecret = process.env.REALTIME_APP_SECRET || '';
export const authEndpoint = `${process.env.PLATFORM_URL}/realtime/auth`;
