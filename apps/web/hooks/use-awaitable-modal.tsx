import { useRef, useState, type ReactNode } from 'react';

type AwaitableModalApi<ResolveArgs, OpenArgs> = {
  open: boolean;
  args?: OpenArgs;
  onClose: () => void;
  onResolve: (data: ResolveArgs) => void;
};

export default function useAwaitableModal<ResolveArgs, OpenArgs>(
  renderFn: (args: AwaitableModalApi<ResolveArgs, OpenArgs>) => ReactNode
) {
  const [open, setOpen] = useState(false);

  const promiseRef = useRef<{
    resolve: (_: ResolveArgs) => void;
    reject: (res: Error | null) => void;
    args: OpenArgs;
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
      },
      args: promiseRef.current?.args
    });

  const openModal = (args: OpenArgs) =>
    new Promise<ResolveArgs>((resolve, reject) => {
      promiseRef.current = { resolve, reject, args };
      setOpen(true);
    });

  return { ModalRoot, openModal };
}
