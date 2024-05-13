import { UAParser } from 'ua-parser-js';
import { lucia } from './auth';
import type { TypeId } from '@u22n/utils';
import type { Context } from 'hono';

type SessionInfo = {
  accountId: number;
  username: string;
  publicId: TypeId<'account'>;
};

export const createLuciaSessionCookie = async (
  event: Context,
  info: SessionInfo
) => {
  const { device, os } = UAParser(event.req.header('User-Agent'));
  const userDevice =
    device.type === 'mobile' ? device.toString() : device.vendor;
  const { accountId, username, publicId } = info;
  const accountSession = await lucia.createSession(accountId, {
    account: {
      id: accountId,
      username,
      publicId
    },
    device: userDevice || 'Unknown',
    os: os.name || 'Unknown'
  });
  const cookie = lucia.createSessionCookie(accountSession.id);
  return cookie;
};
