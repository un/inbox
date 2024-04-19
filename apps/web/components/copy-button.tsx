'use client';
import { IconButton } from '@radix-ui/themes';
import { useCopyToClipboard } from '@uidotdev/usehooks';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

export default function CopyButton({
  text,
  onCopy
}: {
  text: string;
  onCopy?: (data: string) => void;
}) {
  const [hasCopied, setHasCopied] = useState(false);
  const [_, copyToClipboard] = useCopyToClipboard();

  return (
    <IconButton
      onClick={() => {
        setHasCopied(true);
        copyToClipboard(text);
        onCopy?.(text);
        setTimeout(() => setHasCopied(false), 1500);
      }}
      variant="soft">
      {hasCopied ? <Check size={16} /> : <Copy size={16} />}
    </IconButton>
  );
}
