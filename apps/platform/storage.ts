import { createStorage, type Driver, type StorageValue } from 'unstorage';
import redisDriver from 'unstorage/drivers/redis';
import type { TypeId } from '@u22n/utils/typeid';
import type { DatabaseSession } from 'lucia';
import type { OrgContext } from './ctx';
import { ms } from '@u22n/utils/ms';
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
  passkeyChallenges: createCachedStorage<PasskeyChallenges>(
    'passkey-challenges',
    ms('5 minutes')
  ),
  twoFactorLoginChallenges: createCachedStorage<TwoFactorLoginChallenges>(
    'two-factor-login-challenges',
    ms('5 minutes')
  ),
  twoFactorResetChallenges: createCachedStorage<TwoFactorResetChallenges>(
    'two-factor-reset-challenges',
    ms('5 minutes')
  ),
  recoveryEmailVerificationCodes:
    createCachedStorage<RecoveryEmailVerificationCodes>(
      'recovery-email-verification-codes',
      ms('15 minutes')
    ),
  elevatedTokens: createCachedStorage<ElevatedTokens>(
    'elevated-tokens',
    ms('5 minutes')
  ),
  orgContext: createCachedStorage<OrgContext>('org-context', ms('12 hours')),
  session: createCachedStorage<DatabaseSession>(
    'sessions',
    env.NODE_ENV === 'development' ? ms('12 hours') : ms('30 days')
  )
};

type PasskeyChallenges = {
  type: 'registration' | 'authentication';
  challenge: string;
};

type TwoFactorLoginChallenges = {
  account: {
    id: number;
    username: string;
    publicId: TypeId<'account'>;
  };
  defaultOrgSlug?: string;
  secret: string;
};

type TwoFactorResetChallenges = {
  account: {
    username: string;
    publicId: TypeId<'account'>;
  };
  secret: string;
};

type RecoveryEmailVerificationCodes = {
  account: {
    id: number;
    publicId: TypeId<'account'>;
  };
  recoveryEmail: string;
};

type ElevatedTokens = {
  issuer: {
    accountId: number;
    sessionId: string;
    deviceIp: string;
  };
};
