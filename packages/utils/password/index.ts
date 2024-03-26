import { z } from 'zod';
import humanFormat from 'human-format';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import { dictionary, adjacencyGraphs } from '@zxcvbn-ts/language-common';

zxcvbnOptions.setOptions({
  dictionary,
  graphs: adjacencyGraphs
});

export function calculatePasswordStrength(password: string) {
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
  .refine((password) => calculatePasswordStrength(password).allowed, {
    message: 'Password is too weak',
    path: ['password']
  });
