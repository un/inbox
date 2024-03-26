import { z } from 'zod';
import { router, limitedProcedure } from '../../trpc';
import type { DBType } from '@u22n/database';
import { eq } from '@u22n/database/orm';
import { accounts } from '@u22n/database/schema';
import { blockedUsernames, reservedUsernames } from '../../../utils/signup';
import { zodSchemas } from '@u22n/utils';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import { dictionary, adjacencyGraphs } from '@zxcvbn-ts/language-common';
import humanFormat from 'human-format';

export async function validateUsername(
  db: DBType,
  username: string
): Promise<{
  available: boolean;
  error: string | null;
}> {
  const registeredUser = await db.query.accounts.findFirst({
    where: eq(accounts.username, username)
  });

  if (registeredUser) {
    return {
      available: false,
      error: 'Already taken'
    };
  }
  if (blockedUsernames.includes(username.toLowerCase())) {
    return {
      available: false,
      error: 'Username not allowed'
    };
  }
  if (reservedUsernames.includes(username.toLowerCase())) {
    return {
      available: false,
      error:
        'This username is currently reserved. If you own this trademark, please Contact Support'
    };
  }
  return {
    available: true,
    error: null
  };
}

zxcvbnOptions.setOptions({
  dictionary,
  graphs: adjacencyGraphs
});

function calculatePasswordStrength(password: string) {
  const { score, crackTimesSeconds } = zxcvbn(password);
  return {
    score,
    crackTime: humanFormat(crackTimesSeconds.offlineSlowHashing1e4PerSecond, {
      separator: ' ',
      scale: new humanFormat.Scale({
        milliseconds: 1 / 1000,
        seconds: 1,
        minutes: 60,
        hours: 60 * 60,
        days: 60 * 60 * 24,
        weeks: 60 * 60 * 24 * 7,
        months: 60 * 60 * 24 * 30,
        years: 60 * 60 * 24 * 365,
        decades: 60 * 60 * 24 * 365 * 10,
        centuries: 60 * 60 * 24 * 365 * 100
      })
    }),
    allowed: score >= 3
  };
}

export const signupRouter = router({
  checkUsernameAvailability: limitedProcedure
    .input(
      z.object({
        username: zodSchemas.username()
      })
    )
    .query(async ({ ctx, input }) => {
      return await validateUsername(ctx.db, input.username);
    }),
  checkPasswordStrength: limitedProcedure
    .input(
      z.object({
        password: z.string()
      })
    )
    .query(({ input }) => calculatePasswordStrength(input.password))
});
