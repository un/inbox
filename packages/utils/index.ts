import { customAlphabet } from 'nanoid';
import { z } from 'zod';
//! When changing the NanoID length, be sure to update the nanoId customType in the DB schema file to varchar(x)
export const nanoIdLength = 16;
export const nanoIdLongLength = 32;
export const nanoIdTokenLength = 32;
export const nanoId = customAlphabet(
  '0123456789abcdefghjkmnpqrstvwxyz',
  nanoIdLength
);
export const nanoIdLong = customAlphabet(
  '0123456789abcdefghjkmnpqrstvwxyz',
  nanoIdLongLength
);
export const nanoIdToken = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  nanoIdTokenLength
);

export const zodSchemas = {
  nanoId: z.string().min(3).max(nanoIdLength),
  nanoIdLong: z.string().min(3).max(nanoIdLongLength),
  nanoIdToken: z.string().min(3).max(nanoIdTokenLength),
  username: (minLength: number = 5) =>
    z
      .string()
      .min(minLength, {
        message: `Must be at least ${minLength} characters long`
      })
      .max(32, {
        message: 'Too Long, Aint nobody typing that 😂'
      })
      .regex(/^[a-zA-Z0-9]*$/, {
        message: 'Only letters and numbers'
      }),
  password: () =>
    z
      .string()
      .min(8, { message: 'Minimum 8 characters' })
      .max(64)
      .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.*\s).{8,}$/, {
        message:
          'At least one digit, one lowercase letter, one uppercase letter, one special character, no whitespace allowed, minimum eight characters in length'
      })
};
