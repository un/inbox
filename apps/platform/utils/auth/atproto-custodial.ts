import {
  createCipheriv,
  createDecipheriv,
  randomBytes
} from 'node:crypto';
import { AtpAgent } from '@atproto/api';
import { env } from '~platform/env';

function getEncryptionKey(): Buffer {
  return Buffer.from(env.ATPROTO_ENCRYPTION_KEY, 'hex');
}

export function encryptPassword(password: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(password, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptPassword(encryptedStr: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, dataHex] = encryptedStr.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(data).toString('utf8') + decipher.final('utf8');
}

function generateSecurePassword(): string {
  return randomBytes(32).toString('base64url');
}

export async function createCustodialAccount(options: {
  email: string;
  handle: string;
}): Promise<{ did: string; handle: string; encryptedPassword: string }> {
  const { email, handle } = options;
  const password = generateSecurePassword();
  const fullHandle = `${handle}.${env.ATPROTO_HANDLE_DOMAIN}`;

  const agent = new AtpAgent({ service: env.PDS_URL });

  const createAccountInput: {
    email: string;
    handle: string;
    password: string;
    inviteCode?: string;
  } = {
    email,
    handle: fullHandle,
    password
  };

  if (env.PDS_INVITE_CODE) {
    createAccountInput.inviteCode = env.PDS_INVITE_CODE;
  }

  const response = await agent.com.atproto.server.createAccount(
    createAccountInput
  );

  if (!response.success) {
    throw new Error('Failed to create custodial PDS account');
  }

  return {
    did: response.data.did,
    handle: response.data.handle,
    encryptedPassword: encryptPassword(password)
  };
}

export async function verifyCustodialCredentials(options: {
  did: string;
  encryptedPassword: string;
}): Promise<boolean> {
  const { did, encryptedPassword } = options;
  const password = decryptPassword(encryptedPassword);

  const agent = new AtpAgent({ service: env.PDS_URL });
  try {
    await agent.login({ identifier: did, password });
    return true;
  } catch {
    return false;
  }
}
