import Pusher, { type UserAuthenticationCallback } from 'pusher-js';
import { eventDataMaps, type EventDataMap } from './events';
import type { z } from 'zod';

export default class RealtimeClient {
  private client: Pusher | null = null;
  constructor(
    private config: {
      appKey: string;
      host: string;
      port: number;
      authEndpoint: string;
    }
  ) {}
  public async connect({ orgShortCode }: { orgShortCode: string }) {
    if (this.client) return;
    const client = new Pusher(this.config.appKey, {
      wsHost: this.config.host,
      wsPort: Number(this.config.port),
      cluster: 'default',
      forceTLS: false,
      enabledTransports: ['ws'],
      userAuthentication: {
        customHandler: async (params, callback) => {
          const res = await fetch(this.config.authEndpoint, {
            body: JSON.stringify(params),
            method: 'POST',
            credentials: 'include',
            headers: {
              'org-shortcode': orgShortCode,
              'Content-Type': 'application/json'
            }
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
    this.client = client;
    return new Promise<void>((resolve, reject) => {
      client.bind('pusher:signin_success', () => {
        client.unbind('pusher:signin_success');
        resolve();
      });
      client.bind('pusher:error', (e: unknown) => {
        this.client = null;
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

  public on<const T extends keyof EventDataMap>(
    event: T,
    callback: (data: z.infer<EventDataMap[T]>) => Promise<void>
  ) {
    if (!this.client) return;
    this.client.bind(event, (e: unknown) =>
      callback(eventDataMaps[event].parse(e))
    );
  }

  public off<const T extends keyof EventDataMap>(event: T) {
    if (!this.client) return;
    this.client.unbind(event);
  }

  public onBroadcast<const T extends keyof EventDataMap>(
    event: T,
    callback: (data: z.infer<EventDataMap[T]>) => Promise<void>
  ) {
    if (!this.client) return;
    this.client
      .subscribe('broadcasts')
      .bind(event, (e: unknown) => callback(eventDataMaps[event].parse(e)));
  }
}
