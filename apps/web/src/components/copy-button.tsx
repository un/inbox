'use client';
import { type Responsive } from '@radix-ui/themes/props';
import { useCopyToClipboard } from '@uidotdev/usehooks';
import { Check, Copy } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from './shadcn-ui/button';
import { cn } from '../lib/utils';

export default function CopyButton({
  text,
  onCopy,
  size = 16,
  buttonSize = '1'
}: {
  text: string;
  onCopy?: (data: string) => void;
  size?: number;
  buttonSize?: Responsive<'1' | '2' | '3' | '4'>;
}) {
  const [hasCopied, setHasCopied] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();

  return (
    <Button
      variant="secondary"
      size="icon-sm"
      onClick={() => {
        setHasCopied(true);
        void copyToClipboard(text);
        onCopy?.(text);
        setTimeout(() => setHasCopied(false), 1500);
      }}
      className={cn(
        hasCopied ? 'bg-green-5 hover:bg-green-5 text-green-11' : ''
      )}>
      {hasCopied ? <Check size={size} /> : <Copy size={size} />}
    </Button>
  );
}
