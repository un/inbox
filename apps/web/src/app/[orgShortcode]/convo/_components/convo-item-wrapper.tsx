'use client';

import { useGlobalStore } from '@/src/providers/global-store-provider';
import { type RouterOutputs } from '@/src/lib/trpc';
import { ConvoItem } from './convo-list-item';
import { useParams } from 'next/navigation';

type ConvoItemWrapperProps = {
  convo: RouterOutputs['spaces']['getSpaceConvos']['data'][number];
  selected: boolean;
  onSelect: (shiftKey: boolean) => void;
  hidden: boolean;
  isSpaceConvo?: boolean;
};

export function ConvoItemWrapper({
  convo,
  selected,
  onSelect,
  hidden,
  isSpaceConvo = false
}: ConvoItemWrapperProps) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const { spaceShortCode } = useParams();

  if (isSpaceConvo) {
    if (!spaceShortCode || Array.isArray(spaceShortCode)) {
      return <div>Missing space shortcode</div>;
    }
    return (
      <ConvoItem
        convo={convo}
        selected={selected}
        onSelect={onSelect}
        hidden={hidden}
        link={`/${orgShortcode}/${spaceShortCode}/convo/${convo.publicId}`}
      />
    );
  }

  const link = `/${orgShortcode}/convo/${convo.publicId}`;

  return (
    <ConvoItem
      convo={convo}
      selected={selected}
      onSelect={onSelect}
      hidden={hidden}
      link={link}
    />
  );
}
