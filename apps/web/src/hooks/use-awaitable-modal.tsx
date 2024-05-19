//@refresh reset

import { useRef, useState, type ReactNode } from 'react';

type EmptyObject = Record<string, never>;
type ObjectProps = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

export type ModalComponent<
  Props extends ObjectProps = EmptyObject,
  Resolved = null
> = {
  open: boolean;
  onClose: (reason?: Error) => void;
  onResolve: (data: Resolved) => void;
} & Props;

export default function useAwaitableModal<Props extends ObjectProps, Resolved>(
  ModalComponent: (props: ModalComponent<Props, Resolved>) => ReactNode,
  defaultProps: Props
) {
  const [open, setOpen] = useState(false);
  const [props, setProps] = useState<Props>(defaultProps);

  const promiseRef = useRef<{
    resolve: (_: Resolved) => void;
    reject: (_: Error | null) => void;
  }>({ resolve: noop, reject: noop });

  const ModalRoot = () => (
    <ModalComponent
      open={open}
      onClose={(reason) => {
        setOpen(false);
        promiseRef.current.reject(reason ?? null);
      }}
      onResolve={(data) => {
        setOpen(false);
        promiseRef.current.resolve(data);
      }}
      {...props}
    />
  );

  const openModal = (props: Partial<Props> = {}) =>
    new Promise<Resolved>((resolve, reject) => {
      promiseRef.current = { resolve, reject };
      setProps((prev) => ({ ...prev, ...props }));
      setOpen(true);
    });

  return [ModalRoot, openModal] as const;
}
