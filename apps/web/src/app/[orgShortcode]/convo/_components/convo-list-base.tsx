'use client';
import { convoListSelection, lastSelectedConvo } from '../atoms';
import { type RouterOutputs } from '@/src/lib/trpc';
import { SpinnerGap } from '@phosphor-icons/react';
import { type TypeId } from '@u22n/utils/typeid';
import { Virtuoso } from 'react-virtuoso';
import { useCallback } from 'react';
import { useAtom } from 'jotai';

// Define a union type for the convo object
type Convo =
  | RouterOutputs['spaces']['getSpaceConvos']['data'][number]
  | RouterOutputs['convos']['getOrgMemberConvos']['data'][number];

type ConvoListBaseProps = {
  hidden: boolean;
  convos: Convo[];
  isLoading: boolean;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  ConvoItem: React.ComponentType<{
    convo: Convo;
    selected: boolean;
    onSelect: (shiftKey: boolean) => void;
    hidden: boolean;
  }>;
};

export function ConvoListBase({
  hidden,
  convos,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  ConvoItem
}: ConvoListBaseProps) {
  const [selections, setSelections] = useAtom(convoListSelection);
  const [lastSelected, setLastSelected] = useAtom(lastSelectedConvo);
  const allConvos = convos;

  const rangeSelect = useCallback(
    (upto: TypeId<'convos'>) => {
      const isAlreadySelected = selections.includes(upto);
      const lastSelectedIndex = lastSelected
        ? allConvos.findIndex((c) => c.publicId === lastSelected)
        : -1;
      const uptoIndex = allConvos.findIndex((c) => c.publicId === upto);
      const convoRange = allConvos
        .slice(
          Math.min(lastSelectedIndex, uptoIndex),
          Math.max(lastSelectedIndex, uptoIndex) + 1
        )
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
    (index: number, convo: Convo) => {
      if (!convo.publicId) {
        return null;
      }
      const selected = selections.includes(convo.publicId);
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
            hidden={hidden}
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
      hidden,
      allConvos.length,
      hasNextPage,
      rangeSelect,
      selections,
      setLastSelected,
      setSelections,
      ConvoItem
    ]
  );

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
