import { ValidatedAuthSessionObject } from './../../apps/web-app/server/utils/auth';
export type OrgContext = {
  id: number;
  memberId?: number;
  members: {
    id: number;
    userId: number;
    // Refer to DB schema orgMembers.role and orgMembers.status
    role: 'admin' | 'member';
    status: 'active' | 'removed';
  }[];
} | null;
export type UserContext = {
  id: number;
  session: ValidatedAuthSessionObject;
} | null;
export type AuthH3SessionData = {
  isUserLoggedIn: boolean;
  userId?: number | null;
};
