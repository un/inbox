import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren
} from 'react';
import RealtimeClient from '@u22n/realtime/client';
import { useGlobalStore } from './global-store-provider';
import { env } from 'next-runtime-env';
import { toast } from 'sonner';

const realtimeContext = createContext<RealtimeClient | null>(null);

const appKey = env('NEXT_PUBLIC_REALTIME_APP_KEY')!;
const host = env('NEXT_PUBLIC_REALTIME_HOST')!;
const port = Number(env('NEXT_PUBLIC_REALTIME_PORT')!);
const PLATFORM_URL = env('NEXT_PUBLIC_PLATFORM_URL')!;

export function RealtimeProvider({ children }: PropsWithChildren) {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);

  const [client] = useState(
    () =>
      new RealtimeClient({
        appKey,
        host,
        port,
        authEndpoint: `${PLATFORM_URL}/realtime/auth`
      })
  );

  useEffect(() => {
    void client.connect({ orgShortCode }).catch(() => {
      toast.error(
        'UnInbox encountered an error while trying to connect to the realtime server'
      );
    });
    return () => {
      client.disconnect();
    };
  }, [client, orgShortCode]);

  return (
    <realtimeContext.Provider value={client}>
      {children}
    </realtimeContext.Provider>
  );
}

export function useRealtime() {
  const client = useContext(realtimeContext);
  if (!client) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return client;
}
