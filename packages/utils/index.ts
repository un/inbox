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
  nanoIdLong: z.string().min(3).max(nanoIdLongLength),
  nanoIdToken: () => z.string().min(3).max(nanoIdTokenLength),
  username: (minLength: number = 5) =>
    z
      .string()
      .min(minLength, {
        message: `Must be at least ${minLength} characters long`
      })
      .max(32, {
        message: "Too Long, Ain't nobody typing that 😂"
      })
      .regex(/^[a-zA-Z0-9._-]*$/, {
        message: 'Only letters and numbers'
      })
};

export * from './typeId';
export * from './dns';
export * from './dns/txtParsers';
export * from './password';

export const uiColors = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose'
] as const;

export type UiColor = (typeof uiColors)[number];
