import { useRef, useState, type ReactNode } from 'react';

type AwaitableModalApi<T> = {
  open: boolean;
  onClose: () => void;
  onResolve: (data: T) => void;
};

export default function useAwaitableModal<T>(
  renderFn: (args: AwaitableModalApi<T>) => ReactNode
) {
  const [open, setOpen] = useState(false);

  const promiseRef = useRef<{
    resolve: (_: T) => void;
    reject: (res: Error | null) => void;
  } | null>(null);

  const ModalRoot = () =>
    renderFn({
      open,
      onClose: () => {
        setOpen(false);
        promiseRef.current?.reject(null);
      },
      onResolve: (data) => {
        setOpen(false);
        promiseRef.current?.resolve(data);
      }
    });

  const openModal = () =>
    new Promise<T>((resolve, reject) => {
      promiseRef.current = { resolve, reject };
      setOpen(true);
    });

  return { ModalRoot, openModal };
}
