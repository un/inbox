import Pusher, { type UserAuthenticationCallback } from 'pusher-js';
import { eventDataMaps, type EventDataMap } from './events';
import type { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (...args: any[]) => any;
export default class RealtimeClient {
  private client: Pusher | null = null;
  #preConnectEventHandlers = new Map<keyof EventDataMap, EventHandler[]>();
  #preConnectBroadcastHandlers = new Map<keyof EventDataMap, EventHandler[]>();
  #connectionTimeout: NodeJS.Timeout | null = null;

  constructor(
    private config: {
      appKey: string;
      host: string;
      port: number;
      authEndpoint: string;
    }
  ) {}

  public async connect({ orgShortcode }: { orgShortcode: string }) {
    if (this.client) return;
    const client = new Pusher(this.config.appKey, {
      wsHost: this.config.host,
      wsPort: Number(this.config.port),
      cluster: 'default',
      forceTLS: false,
      enabledTransports: ['ws', 'wss'],
      userAuthentication: {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        customHandler: async (params, callback) => {
          const res = await fetch(this.config.authEndpoint, {
            body: JSON.stringify(params),
            method: 'POST',
            credentials: 'include',
            headers: {
              'org-shortcode': orgShortcode,
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
    this.bindEvents();
    return new Promise<void>((resolve, reject) => {
      this.#connectionTimeout = setTimeout(() => {
        this.client = null;
        reject(new Error('Connection timeout'));
      }, 10000);

      client.bind('pusher:signin_success', () => {
        client.unbind('pusher:signin_success');
        if (this.#connectionTimeout) clearTimeout(this.#connectionTimeout);
        resolve();
      });

      client.bind('pusher:error', (e: unknown) => {
        this.client = null;
        if (this.#connectionTimeout) clearTimeout(this.#connectionTimeout);
        reject(e);
      });
    });
  }

  public disconnect() {
    if (this.client) {
      this.client.disconnect();
      if (this.#connectionTimeout) clearTimeout(this.#connectionTimeout);
      this.client = null;
    }
  }

  public on<const T extends keyof EventDataMap>(
    event: T,
    callback: (data: z.infer<EventDataMap[T]>) => Promise<void>
  ) {
    if (!this.client) {
      const existing = this.#preConnectEventHandlers.get(event) ?? [];
      existing.push(callback);
      this.#preConnectEventHandlers.set(event, existing);
    } else {
      this.client.bind(event, (e: unknown) =>
        callback(eventDataMaps[event].parse(e))
      );
    }
  }

  public off<const T extends keyof EventDataMap>(event: T) {
    if (!this.client) {
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      this.#preConnectEventHandlers.delete(event);
    } else {
      this.client.unbind(event);
    }
  }

  public onBroadcast<const T extends keyof EventDataMap>(
    event: T,
    callback: (data: z.infer<EventDataMap[T]>) => Promise<void>
  ) {
    if (!this.client) {
      const existing = this.#preConnectBroadcastHandlers.get(event) ?? [];
      existing.push(callback);
      this.#preConnectBroadcastHandlers.set(event, existing);
    } else {
      this.client
        .subscribe('broadcasts')
        .bind(event, (e: unknown) => callback(eventDataMaps[event].parse(e)));
    }
  }

  public get isConnected() {
    return !!this.client;
  }

  private bindEvents() {
    if (!this.client) return;
    for (const [event, handlers] of this.#preConnectEventHandlers) {
      handlers.forEach((handler) => {
        if (!this.client) return;
        this.client.bind(event, (e: unknown) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          handler(eventDataMaps[event].parse(e))
        );
      });
    }
    for (const [event, handlers] of this.#preConnectBroadcastHandlers) {
      handlers.forEach((handler) => {
        if (!this.client) return;
        this.client
          .subscribe('broadcasts')
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          .bind(event, (e: unknown) => handler(eventDataMaps[event].parse(e)));
      });
    }
    this.#preConnectEventHandlers.clear();
    this.#preConnectBroadcastHandlers.clear();
  }
}
