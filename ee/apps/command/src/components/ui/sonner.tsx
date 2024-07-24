'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={'dark'}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-base-2 group-[.toaster]:text-base-12 group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-base-11',
          actionButton:
            'group-[.toast]:bg-accent-9 group-[.toast]:text-accent-1',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-base-11'
        }
      }}
      {...props}
    />
  );
};

export { Toaster };
