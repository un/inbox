import type { Context } from '@u22n/hono/helpers';
import type { HonoContext } from '@u22n/hono';
import type { DBType } from '@u22n/database';
import type { DatabaseSession } from 'lucia';

export type Ctx = HonoContext<{
  account: AccountContext;
}>;

export type OrgContext = {
  id: number;
  publicId: string;
  name: string;
  memberId?: number;
  members: {
    id: number;
    accountId: number | null;
    // Refer to DB schema orgMembers.role and orgMembers.status
    status: 'invited' | 'active' | 'removed';
    role: 'admin' | 'member';
  }[];
} | null;

export type AccountContext = {
  id: number;
  session: DatabaseSession;
} | null;

export type TrpcContext = {
  db: DBType;
  account: AccountContext;
  org: OrgContext;
  event: Context<Ctx>;
  selfHosted: boolean;
};
