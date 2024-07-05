import { z } from 'zod';
import { router, accountProcedure } from '~platform/trpc/trpc';
import type { DBType } from '@u22n/database';
import { eq, and } from '@u22n/database/orm';
import {
  orgs,
  orgMembers,
  orgMemberProfiles,
  accounts,
  spaces,
  spaceMembers
} from '@u22n/database/schema';
import { typeIdGenerator } from '@u22n/utils/typeid';
import { TRPCError } from '@trpc/server';
import { blockedUsernames, reservedUsernames } from '~platform/utils/signup';

export const spaceMemberRouter = router({});
