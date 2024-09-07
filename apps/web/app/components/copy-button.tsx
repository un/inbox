import { Button, type ButtonProps } from '@/components/shadcn-ui/button';
import { type ElementRef, forwardRef, useState } from 'react';
import { Check, Copy } from '@phosphor-icons/react';
import { cn, copyToClipboard } from '../lib/utils';
import { toast } from 'sonner';

export const CopyButton = forwardRef<
  ElementRef<'button'>,
  Omit<ButtonProps, 'ref'> & {
    text: string;
    onCopy?: (data: string) => void;
    iconSize?: number;
  }
>(({ text, onCopy, iconSize = 15, ...props }, ref) => {
  const [hasCopied, setHasCopied] = useState(false);

  return (
    <Button
      variant="secondary"
      size="icon-sm"
      {...props}
      ref={ref}
      onClick={async () => {
        setHasCopied(true);
        await copyToClipboard(text).catch(() => {
          toast.error('Failed to copy to clipboard');
          setHasCopied(false);
        });
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
