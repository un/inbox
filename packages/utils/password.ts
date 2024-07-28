import { dictionary, adjacencyGraphs } from '@zxcvbn-ts/language-common';
import { haveIBeenPwned } from '@zxcvbn-ts/matcher-pwned';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import humanFormat from 'human-format';
import { z } from 'zod';

zxcvbnOptions.setOptions({
  dictionary,
  graphs: adjacencyGraphs
});

export async function calculatePasswordStrength(password: string) {
  const pawned = await haveIBeenPwned(password, {
    universalFetch: fetch
  });

  if (pawned) {
    return {
      score: 0,
      crackTime: 'a few moments',
      allowed: false
    };
  }

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

export const strongPasswordSchema = z
  .string()
  .min(8, { message: 'Minimum 8 characters required' })
  .refine(
    async (password) => (await calculatePasswordStrength(password)).allowed,
    {
      message: 'Password is too weak',
      path: ['password']
    }
  );
