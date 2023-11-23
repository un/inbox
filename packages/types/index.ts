import { ValidatedAuthSessionObject } from './../../apps/web-app/server/utils/auth';
export type OrgContext = {
  id: number;
  members: number[];
} | null;
export type UserContext = {
  id: number;
  session: ValidatedAuthSessionObject;
} | null;
export type AuthH3SessionData = {
  isUserLoggedIn: boolean;
  userId?: number | null;
};
