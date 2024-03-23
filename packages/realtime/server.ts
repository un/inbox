import Pusher from 'pusher';
import type { RealtimeEventsMap } from './types';
import type { TypeId } from '@u22n/utils';

export default class RealtimeServer {
  private pusher: Pusher;
  constructor(config: {
    host: string;
    port: string;
    appId: string;
    appKey: string;
    appSecret: string;
  }) {
    this.pusher = new Pusher({
      host: config.host,
      port: config.port,
      appId: config.appId,
      key: config.appKey,
      secret: config.appSecret,
      cluster: 'default',
      timeout: 10000
    });
  }

  broadcast<T extends keyof RealtimeEventsMap>(
    event: T,
    data: Parameters<RealtimeEventsMap[T]>[0]
  ) {
    this.pusher.trigger('broadcasts', event, data);
  }

  emit<T extends keyof RealtimeEventsMap>(
    accountIds: TypeId<'account'> | TypeId<'account'>[],
    event: T,
    data?: Parameters<RealtimeEventsMap[T]>[0]
  ) {
    if (typeof accountIds === 'string') accountIds = [accountIds];
    for (const id of accountIds) {
      this.pusher.sendToUser(id, event, data);
    }
  }

  authenticate(socketId: string, accountId: TypeId<'account'>) {
    return this.pusher.authenticateUser(socketId, {
      id: accountId
    });
  }
}
