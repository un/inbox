import { type EventDataMap, eventDataMaps } from './events';
import type { TypeId } from '@u22n/utils/typeid';
import type { z } from 'zod';
import Pusher from 'pusher';

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

  public async emit<const T extends keyof EventDataMap>({
    orgMemberPublicIds,
    event,
    data
  }: {
    orgMemberPublicIds: TypeId<'orgMembers'> | TypeId<'orgMembers'>[];
    event: T;
    data: z.infer<EventDataMap[T]>;
  }) {
    if (typeof orgMemberPublicIds === 'string')
      orgMemberPublicIds = [orgMemberPublicIds];
    // Parse the data before sending it to the client, ensuring it matches the schema
    for (const id of orgMemberPublicIds) {
      await this.pusher.sendToUser(id, event, eventDataMaps[event].parse(data));
    }
  }

  public authenticate(
    socketId: string,
    orgMemberPublicId: TypeId<'orgMembers'>
  ) {
    return this.pusher.authenticateUser(socketId, {
      id: orgMemberPublicId
    });
  }
}
