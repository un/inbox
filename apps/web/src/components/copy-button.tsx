'use client';
import { IconButton } from '@radix-ui/themes';
import { type Responsive } from '@radix-ui/themes/props';
import { useCopyToClipboard } from '@uidotdev/usehooks';
import { Check, Copy } from '@phosphor-icons/react';
import { useState } from 'react';

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
    <IconButton
      size={buttonSize}
      onClick={() => {
        setHasCopied(true);
        void copyToClipboard(text);
        onCopy?.(text);
        setTimeout(() => setHasCopied(false), 1500);
      }}
      variant="soft">
      {hasCopied ? <Check size={size} /> : <Copy size={size} />}
    </IconButton>
  );
}
