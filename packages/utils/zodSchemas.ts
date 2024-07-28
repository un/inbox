import { customAlphabet } from 'nanoid';
import { z } from 'zod';

//! When changing the NanoID length, be sure to update the nanoId customType in the DB schema file to varchar(x)

export const nanoIdLongLength = 32;
export const nanoIdTokenLength = 32;

export const nanoIdLong = customAlphabet(
  '0123456789abcdefghjkmnpqrstvwxyz',
  nanoIdLongLength
);
export const nanoIdToken = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  nanoIdTokenLength
);

export const zodSchemas = {
  nanoIdLong: z
    .string()
    .min(nanoIdLongLength, {
      message: `Token must be ${nanoIdLongLength} characters long`
    })
    .max(nanoIdLongLength, {
      message: `Token must be ${nanoIdLongLength} characters long`
    }),
  nanoIdToken: () =>
    z
      .string()
      .min(nanoIdTokenLength, {
        message: `Token must be ${nanoIdTokenLength} characters long`
      })
      .max(nanoIdTokenLength, {
        message: `Token must be ${nanoIdTokenLength} characters long`
      }),
  username: (minLength = 5) =>
    z
      .string()
      .min(minLength, {
        message: `Must be at least ${minLength} characters long`
      })
      .max(32, {
        message: 'Too Long'
      })
      .regex(/^[a-zA-Z0-9]*$/, {
        message: 'Only letters and numbers'
      }),
  usernameLogin: (minLength = 5) =>
    z
      .string()
      .min(minLength, {
        message: `Must be at least ${minLength} characters long`
      })
      .max(32, {
        message: 'Too Long'
      })
      .regex(/^[a-zA-Z0-9._-]*$/, {
        message: 'Only letters and numbers'
      })
};
