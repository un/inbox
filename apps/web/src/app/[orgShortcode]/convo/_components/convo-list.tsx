'use client';

import { useGlobalStore } from '@/src/providers/global-store-provider';
import { convoListSelection, lastSelectedConvo } from '../atoms';
import { platform, type RouterOutputs } from '@/src/lib/trpc';
import { SpinnerGap } from '@phosphor-icons/react';
import { memo, useCallback, useMemo } from 'react';
import { type TypeId } from '@u22n/utils/typeid';
import { ConvoItem } from './convo-list-item';
import { Virtuoso } from 'react-virtuoso';
import { ms } from '@u22n/utils/ms';
import { useAtom } from 'jotai';

type Props = {
  hidden: boolean;
};

type Convo = RouterOutputs['convos']['getOrgMemberConvos']['data'][number];

export function ConvoList({ hidden }: Props) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const [selections, setSelections] = useAtom(convoListSelection);
  const [lastSelected, setLastSelected] = useAtom(lastSelectedConvo);

  const {
    data: convos,
    fetchNextPage,
    isLoading,
    hasNextPage,
    isFetchingNextPage
  } = platform.convos.getOrgMemberConvos.useInfiniteQuery(
    {
      orgShortcode,
      includeHidden: hidden ? true : undefined
    },
    {
      getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
      staleTime: ms('1 hour')
    }
  );

  const nextPageFetcher = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allConvos = useMemo(
    () => (convos ? convos.pages.flatMap(({ data }) => data) : []),
    [convos]
  );

  const rangeSelect = useCallback(
    (upto: TypeId<'convos'>) => {
      const isAlreadySelected = selections.includes(upto);
      const lastSelectedIndex = lastSelected
        ? allConvos.findIndex((c) => c.publicId === lastSelected)
        : -1;
      const uptoIndex = allConvos.findIndex((c) => c.publicId === upto);
      const convoRange = allConvos
        .slice(lastSelectedIndex, uptoIndex + 1)
        .map((c) => c.publicId);
      const totalSelections = isAlreadySelected
        ? selections.filter((c) => !convoRange.includes(c))
        : selections.concat(convoRange);
      setSelections(Array.from(new Set(totalSelections)));
      setLastSelected(upto);
    },
    [lastSelected, allConvos, setLastSelected, selections, setSelections]
  );

  const onSelect = useCallback(
    (convo: Convo, shiftKey: boolean, selected: boolean) => {
      if (shiftKey) {
        rangeSelect(convo.publicId);
      } else {
        setSelections((prev) =>
          selected
            ? prev.filter((c) => c !== convo.publicId)
            : prev.concat(convo.publicId)
        );
        setLastSelected(convo.publicId);
      }
    },
    [rangeSelect, setLastSelected, setSelections]
  );

  const itemRenderer = useCallback(
    (_: number, convo: Convo) => {
      const selected = selections.includes(convo.publicId);
      return (
        <MemoizedConvoItem
          key={convo.publicId}
          convo={convo}
          selected={selected}
          onSelect={onSelect}
          hidden={hidden}
        />
      );
    },
    [onSelect, hidden, selections]
  );

  const LoadingFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <div className="flex w-full items-center justify-center gap-1 text-center font-semibold">
        <SpinnerGap
          className="size-4 animate-spin"
          size={16}
        />
        Loading...
      </div>
    );
  }, [isFetchingNextPage]);

  return (
    <div className="flex h-full flex-col">
      {isLoading ? (
        <div className="flex w-full items-center justify-center gap-2 text-center font-bold">
          <SpinnerGap
            className="size-4 animate-spin"
            size={16}
          />
          Loading...
        </div>
      ) : allConvos.length > 0 ? (
        <Virtuoso
          data={allConvos}
          itemContent={itemRenderer}
          style={{ overscrollBehavior: 'contain', overflowX: 'clip' }}
          endReached={nextPageFetcher}
          increaseViewportBy={500}
          components={{
            Footer: LoadingFooter
          }}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/inbox-zero.svg"
            alt="You have no convos"
            className="aspect-square w-full"
          />
          {hidden ? (
            <span className="font-semibold">There are no hidden convos</span>
          ) : (
            <>
              <span className="font-semibold">There are no messages</span>
              <span>Enjoy your day!</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

type MemoizedConvoItemProps = {
  convo: Convo;
  selected: boolean;
  onSelect: (convo: Convo, shiftKey: boolean, selected: boolean) => void;
  hidden: boolean;
};

const MemoizedConvoItem = memo(function MemoizedConvoItem({
  convo,
  selected,
  onSelect,
  hidden
}: MemoizedConvoItemProps) {
  return (
    <div className="py-0.5">
      <ConvoItem
        convo={convo}
        selected={selected}
        onSelect={(shiftKey) => onSelect(convo, shiftKey, selected)}
        hidden={hidden}
      />
    </div>
  );
});
