import type { DatabaseSession } from 'lucia';
export type OrgContext = {
  id: number;
  publicId: string;
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
  session: DatabaseSession;
} | null;
export type AuthH3SessionData = {
  isUserLoggedIn: boolean;
  userId?: number | null;
};
export interface MailDomainEntries {
  name: string;
  postalId: string;
}
export type { TrpcMailBridgeRouter } from '../../apps/mail-bridge';
