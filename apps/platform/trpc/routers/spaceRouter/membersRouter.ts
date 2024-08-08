import {
  orgs,
  orgMembers,
  orgMemberProfiles,
  accounts,
  spaces,
  spaceMembers
} from '@u22n/database/schema';
import { blockedUsernames, reservedUsernames } from '~platform/utils/signup';
import { router, accountProcedure } from '~platform/trpc/trpc';
import { typeIdGenerator } from '@u22n/utils/typeid';
import { eq, and } from '@u22n/database/orm';
import type { DBType } from '@u22n/database';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const spaceMembersRouter = router({});
