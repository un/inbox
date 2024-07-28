'use client';

import { Button, type ButtonProps } from '@/src/components/shadcn-ui/button';
import { type ElementRef, forwardRef, useState } from 'react';
import { useCopyToClipboard } from '@uidotdev/usehooks';
import { Check, Copy } from '@phosphor-icons/react';
import { cn } from '../lib/utils';

export const CopyButton = forwardRef<
  ElementRef<'button'>,
  Omit<ButtonProps, 'ref'> & {
    text: string;
    onCopy?: (data: string) => void;
    iconSize?: number;
  }
>(({ text, onCopy, iconSize = 15, ...props }, ref) => {
  const [hasCopied, setHasCopied] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();

  return (
    <Button
      variant="secondary"
      size="icon-sm"
      {...props}
      ref={ref}
      onClick={() => {
        setHasCopied(true);
        void copyToClipboard(text);
        onCopy?.(text);
        setTimeout(() => setHasCopied(false), 1500);
      }}
      className={cn(
        hasCopied ? 'bg-green-5 hover:bg-green-5 text-green-11' : ''
      )}>
      {hasCopied ? <Check size={iconSize} /> : <Copy size={iconSize} />}
    </Button>
  );
});

CopyButton.displayName = 'CopyButton';
