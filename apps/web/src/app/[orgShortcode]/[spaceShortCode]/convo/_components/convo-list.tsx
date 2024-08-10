'use client';

import { convoListSelection, lastSelectedConvo } from '../../../convo/atoms';
import { ConvoItem } from '../../../convo/_components/convo-list-item';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { SpinnerGap } from '@phosphor-icons/react';
import { type TypeId } from '@u22n/utils/typeid';
import { useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { platform } from '@/src/lib/trpc';
import { Virtuoso } from 'react-virtuoso';
import { ms } from '@u22n/utils/ms';
import { useAtom } from 'jotai';

type Props = {
  hidden: boolean;
};

export function ConvoList(props: Props) {
  const { spaceShortCode } = useParams();
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const [selections, setSelections] = useAtom(convoListSelection);
  const [lastSelected, setLastSelected] = useAtom(lastSelectedConvo);

  const {
    data: convos,
    fetchNextPage,
    isLoading,
    hasNextPage,
    isFetchingNextPage
  } = platform.spaces.getSpaceConvos.useInfiniteQuery(
    {
      orgShortcode,
      spaceShortCode: spaceShortCode as string,
      includeHidden: props.hidden ? true : undefined
    },
    {
      getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
      staleTime: ms('1 hour')
    }
  );

  console.log('convos inisde spaces', convos);

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

  const itemRenderer = useCallback(
    (index: number, convo: (typeof allConvos)[number]) => {
      const selected = selections.includes(convo.publicId);
      console.log('convo', convo);
      return (
        <div
          key={convo.publicId}
          className="py-0.5">
          <ConvoItem
            convo={convo}
            selected={selected}
            onSelect={(shiftKey) => {
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
            }}
            hidden={props.hidden}
          />
          {index === allConvos.length - 1 && hasNextPage && (
            <div className="flex w-full items-center justify-center gap-1 text-center font-semibold">
              <SpinnerGap
                className="size-4 animate-spin"
                size={16}
              />
              Loading...
            </div>
          )}
        </div>
      );
    },
    [
      props.hidden,
      allConvos.length,
      hasNextPage,
      rangeSelect,
      selections,
      setLastSelected,
      setSelections
    ]
  );
  console.log('allConvos space', allConvos);

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
          endReached={async () => {
            if (hasNextPage && !isFetchingNextPage) await fetchNextPage();
          }}
          increaseViewportBy={500}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/inbox-zero.svg"
            alt="You have no convos"
            className="aspect-square w-full"
          />
          {props.hidden ? (
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
