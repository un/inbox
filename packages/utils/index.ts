import { customAlphabet } from 'nanoid';

//! When changing the NanoID length, be sure to update the nanoId customType in the DB schema file to varchar(x)
export const generateNanoId = customAlphabet('0123456789abcdefghjkmnpqrstvwxyz', 16);
