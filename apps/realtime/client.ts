import Pusher, { type UserAuthenticationCallback } from 'pusher-js';
import { appKey, host, port, authEndpoint } from './config';
import { type RealtimeEventsMap } from './types';

export default class RealtimeClient {
  private client: Pusher | null = null;

  public async connect() {
    if (this.client) return;
    const client = new Pusher(appKey, {
      wsHost: host,
      wsPort: Number(port),
      cluster: 'default',
      //   forceTLS: platformUrl.startsWith('https'),
      enabledTransports: ['ws', 'wss'],
      userAuthentication: {
        customHandler: async (params, callback) => {
          const res = await fetch(authEndpoint, {
            body: JSON.stringify(params),
            method: 'POST',
            credentials: 'include'
          });
          if (!res.ok) {
            return callback(new Error('Unauthorized'), null);
          }
          callback(
            null,
            (await res.json()) as Parameters<UserAuthenticationCallback>['1']
          );
        }
      }
    });

    client.signin();
    return new Promise<void>((resolve, reject) => {
      client.bind('pusher:signin_success', () => {
        this.client = client;
        client.unbind('pusher:signin_success');
        resolve();
      });
      client.bind('pusher:error', (e: unknown) => {
        reject(e);
      });
    });
  }

  public disconnect() {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
  }

  public on<const T extends keyof RealtimeEventsMap>(
    event: T,
    callback: RealtimeEventsMap[T]
  ) {
    if (!this.client) {
      throw new Error('Client not connected');
    }
    this.client.bind(event, callback);
  }

  public off<const T extends keyof RealtimeEventsMap>(event: T) {
    if (!this.client) {
      throw new Error('Client not connected');
    }
    this.client.unbind(event);
  }

  public onBroadcast<const T extends keyof RealtimeEventsMap>(
    event: T,
    callback: RealtimeEventsMap[T]
  ) {
    if (!this.client) {
      throw new Error('Client not connected');
    }
    this.client.subscribe('broadcasts').bind(event, callback);
  }
}
