// Legacy compatibility shim — previously exported createLuciaSessionCookie.
// New code should import createSessionCookie from ~platform/utils/auth/session-manager.
export { createSessionCookie as createLuciaSessionCookie } from './auth/session-manager';
