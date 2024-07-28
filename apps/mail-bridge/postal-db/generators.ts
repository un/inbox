import {
  generateKeyPair as _generateKeyPair,
  createPublicKey
} from 'node:crypto';
import { customAlphabet } from 'nanoid';
import { domains } from './schema';
import { eq } from 'drizzle-orm';
import { promisify } from 'util';
import { postalDB } from '.';

export const randomAlphaNumeric = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
);
export const randomAlphabetic = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
);

const stripPemHeader = (pem: string) => {
  return pem
    .split('\n')
    .filter((line) => line !== '' && !line.includes('----'))
    .join('');
};

const generateKeyPair = promisify(_generateKeyPair);
export const generateDKIMKeyPair = async () => {
  const { privateKey, publicKey } = await generateKeyPair('rsa', {
    modulusLength: 1024,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  return { privateKey, publicKey: stripPemHeader(publicKey) };
};

export const generatePublicKey = (privateKey: string) => {
  const publicKeyObject = createPublicKey(privateKey);
  return stripPemHeader(
    publicKeyObject
      .export({
        type: 'spki',
        format: 'pem'
      })
      .toString('utf-8')
  );
};

export const getUniqueDKIMSelector = async () => {
  // We will try most 3 times to generate a unique selector
  for (let i = 0; i < 3; i++) {
    const selector = randomAlphabetic(8); // Postal uses 6 characters, but we will use 8 to be safe
    const res = await postalDB.query.domains.findFirst({
      where: eq(domains.dkimIdentifierString, selector),
      columns: {
        id: true
      }
    });
    if (!res) {
      return selector;
    }
  }
  throw new Error('Failed to generate unique DKIM selector');
};
