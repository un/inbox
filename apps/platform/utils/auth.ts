// Re-exports from session-manager — replaces Lucia entirely.
// The `lucia` alias lets existing callers (routes/auth.ts, securityRouter.ts)
// keep their import without churn until they are updated in Phase 5.
export type { AuthAccount, AppSession } from './auth/session-manager';
export {
  sessionManager,
  createSessionCookie,
  sessionManager as lucia
} from './auth/session-manager';
