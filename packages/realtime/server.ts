import Pusher from 'pusher';
import { type EventDataMap, eventDataMaps } from './events';
import type { TypeId } from '@u22n/utils';
import type { z } from 'zod';

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

  public async broadcast<const T extends keyof EventDataMap>(
    event: T,
    data: z.infer<EventDataMap[T]>
  ) {
    // Parse the data before sending it to the client, ensuring it matches the schema
    await this.pusher.trigger(
      'broadcasts',
      event,
      eventDataMaps[event].parse(data)
    );
  }

  public async emit<const T extends keyof EventDataMap>(
    accountIds: TypeId<'account'> | TypeId<'account'>[],
    event: T,
    data: z.infer<EventDataMap[T]>
  ) {
    if (typeof accountIds === 'string') accountIds = [accountIds];
    // Parse the data before sending it to the client, ensuring it matches the schema
    for (const id of accountIds) {
      await this.pusher.sendToUser(id, event, eventDataMaps[event].parse(data));
    }
  }

  public authenticate(socketId: string, accountId: TypeId<'account'>) {
    return this.pusher.authenticateUser(socketId, {
      id: accountId
    });
  }
}
