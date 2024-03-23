import type { EventHandlerRequest, H3Event } from 'h3';
import { UAParser } from 'ua-parser-js';
import { getHeader } from 'h3';
import { lucia } from './auth';
import type { TypeId } from '@u22n/utils';

type SessionInfo = {
  accountId: number;
  username: string;
  publicId: TypeId<'account'>;
};

export const createLuciaSessionCookie = async (
  event: H3Event<EventHandlerRequest>,
  info: SessionInfo
) => {
  const { device, os } = UAParser(getHeader(event, 'User-Agent'));
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
