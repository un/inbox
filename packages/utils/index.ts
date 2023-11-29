import { customAlphabet } from 'nanoid';

//! When changing the NanoID length, be sure to update the nanoId customType in the DB schema file to varchar(x)
export const nanoIdLength = 16;
export const nanoIdLongLength = 32;
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
  32
);
