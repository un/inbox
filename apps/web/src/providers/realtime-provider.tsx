import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren
} from 'react';
import { useGlobalStore } from './global-store-provider';
import RealtimeClient from '@u22n/realtime/client';
import { toast } from 'sonner';
import { env } from '../env';

const realtimeContext = createContext<RealtimeClient | null>(null);

export function RealtimeProvider({ children }: PropsWithChildren) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);

  const [client] = useState(
    () =>
      new RealtimeClient({
        appKey: env.NEXT_PUBLIC_REALTIME_APP_KEY,
        host: env.NEXT_PUBLIC_REALTIME_HOST,
        port: env.NEXT_PUBLIC_REALTIME_PORT,
        authEndpoint: `${env.NEXT_PUBLIC_PLATFORM_URL}/realtime/auth`
      })
  );

  useEffect(() => {
    void client.connect({ orgShortcode }).catch(() => {
      toast.error(
        'UnInbox encountered an error while trying to connect to the realtime server'
      );
    });
    return () => {
      client.disconnect();
    };
  }, [client, orgShortcode]);

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
