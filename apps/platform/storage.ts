import { createStorage, type Driver, type StorageValue } from 'unstorage';
import redisDriver from 'unstorage/drivers/redis';
import type { TypeId } from '@u22n/utils/typeid';
import type { AppSession } from './utils/auth/session-manager';
import { seconds } from '@u22n/utils/ms';
import type { OrgContext } from './ctx';
import { env } from './env';

const createCachedStorage = <T extends StorageValue = StorageValue>(
  base: string,
  ttl: number
) =>
  createStorage<T>({
    driver: redisDriver({
      url: env.DB_REDIS_CONNECTION_STRING,
      ttl,
      base
    }) as Driver
  });

export const storage = {
  elevatedTokens: createCachedStorage<ElevatedTokens>(
    'elevated-tokens',
    seconds('5 minutes')
  ),
  orgContext: createCachedStorage<OrgContext>(
    'org-context',
    seconds('12 hours')
  ),
  session: createCachedStorage<AppSession>(
    'sessions',
    env.NODE_ENV === 'development' ? seconds('12 hours') : seconds('30 days')
  ),
  // AT Protocol OAuth stores
  oauthState: createCachedStorage<string>(
    'atproto-oauth-state',
    seconds('10 minutes')
  ),
  oauthSession: createCachedStorage<string>(
    'atproto-oauth-session',
    seconds('30 days')
  ),
  // Recovery email verification (still used for transactional email verify)
  recoveryEmailVerificationCodes:
    createCachedStorage<RecoveryEmailVerificationCodes>(
      'recovery-email-verification-codes',
      seconds('15 minutes')
    )
};

type ElevatedTokens = {
  issuer: {
    accountId: number;
    sessionId: string;
    deviceIp: string;
  };
};

type RecoveryEmailVerificationCodes = {
  account: {
    id: number;
    publicId: TypeId<'account'>;
  };
  recoveryEmail: string;
};
