import { createStorage, type Driver, type StorageValue } from 'unstorage';
import redisDriver from 'unstorage/drivers/redis';
import type { TypeId } from '@u22n/utils/typeid';
import type { DatabaseSession } from 'lucia';
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
  passkeyChallenges: createCachedStorage<PasskeyChallenges>(
    'passkey-challenges',
    seconds('5 minutes')
  ),
  twoFactorLoginChallenges: createCachedStorage<TwoFactorLoginChallenges>(
    'two-factor-login-challenges',
    seconds('5 minutes')
  ),
  twoFactorResetChallenges: createCachedStorage<TwoFactorResetChallenges>(
    'two-factor-reset-challenges',
    seconds('5 minutes')
  ),
  // used when a user wants to recover a password
  accountRecoveryVerificationCodes:
    createCachedStorage<AccountRecoveryVerificationCodes>(
      'account-recovery-verification-codes',
      seconds('15 minutes')
    ),
  // used when user adds a recovery email
  recoveryEmailVerificationCodes:
    createCachedStorage<RecoveryEmailVerificationCodes>(
      'recovery-email-verification-codes',
      seconds('15 minutes')
    ),
  elevatedTokens: createCachedStorage<ElevatedTokens>(
    'elevated-tokens',
    seconds('5 minutes')
  ),
  orgContext: createCachedStorage<OrgContext>(
    'org-context',
    seconds('12 hours')
  ),
  session: createCachedStorage<DatabaseSession>(
    'sessions',
    env.NODE_ENV === 'development' ? seconds('12 hours') : seconds('30 days')
  ),
  resetTokens: createCachedStorage<ResetTokens>(
    'reset-tokens',
    seconds('15 minutes')
  )
};

type AccountRecoveryVerificationCodes = {
  account: {
    id: number;
    username: string;
    publicId: TypeId<'account'>;
  };
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

type ResetTokens = {
  account: {
    username: string;
    id: number;
    publicId: TypeId<'account'>;
  };
};
