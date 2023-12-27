import { AdapterSession } from './../authjs/src/adapters';

export type OrgContext = {
  id: number;
  memberId?: number;
  members: {
    id: number;
    userId: number | null;
    // Refer to DB schema orgMembers.role and orgMembers.status
    status: 'invited' | 'active' | 'removed';
    role: 'admin' | 'member';
  }[];
} | null;
export type UserContext = {
  id: number;
  session: AdapterSession;
} | null;
export type AuthH3SessionData = {
  isUserLoggedIn: boolean;
  userId?: number | null;
};
