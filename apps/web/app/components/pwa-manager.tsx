import { useNetworkConnectivity, usePWAManager } from '@remix-pwa/client';
import { sendSkipWaitingMessage } from '@remix-pwa/sw';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function PWAManager() {
  const { updateAvailable, swUpdate } = usePWAManager();

  useEffect(() => {
    if (updateAvailable) {
      toast.info('Update available!', {
        id: 'update-available',
        duration: Infinity,
        description: 'There is a new version of UnInbox available.',
        action: {
          label: 'Update',
          onClick: () => {
            if (swUpdate.newWorker) sendSkipWaitingMessage(swUpdate.newWorker);
            window.location.reload();
          }
        }
      });
    }
  }, [swUpdate.newWorker, updateAvailable]);

  useNetworkConnectivity({
    onOffline: () => {
      toast.warning(
        'Looks like you are offline. Please check your internet connection.',
        { id: 'offline-warning', duration: Infinity }
      );
    },
    onOnline: () => {
      toast.dismiss('offline-warning');
    }
  });

  return null;
}
