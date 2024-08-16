'use client';
import { convoListSelection, lastSelectedConvo } from '../atoms';
import { AnimatePresence, motion } from 'framer-motion';
import { type RouterOutputs } from '@/src/lib/trpc';
import { SpinnerGap } from '@phosphor-icons/react';
import { type TypeId } from '@u22n/utils/typeid';
import { ConvoItem } from './convo-list-item';
import { Virtuoso } from 'react-virtuoso';
import { memo, useCallback } from 'react';
import { useAtom } from 'jotai';

// Define a union type for the convo object
type Convo =
  | RouterOutputs['spaces']['getSpaceConvos']['data'][number]
  | RouterOutputs['convos']['getOrgMemberConvos']['data'][number];

type ConvoListBaseProps = {
  hidden: boolean;
  convos: Convo[];
  isLoading: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  linkBase: string;
  fetchNextPage: () => Promise<unknown>;
};

export function ConvoListBase({
  hidden,
  convos,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  linkBase
}: ConvoListBaseProps) {
  const [selections, setSelections] = useAtom(convoListSelection);
  const [lastSelected, setLastSelected] = useAtom(lastSelectedConvo);

  const rangeSelect = useCallback(
    (upto: TypeId<'convos'>) => {
      const isAlreadySelected = selections.includes(upto);
      const lastSelectedIndex = lastSelected
        ? convos.findIndex((c) => c.publicId === lastSelected)
        : -1;
      const uptoIndex = convos.findIndex((c) => c.publicId === upto);
      const convoRange = convos
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
    [lastSelected, convos, setLastSelected, selections, setSelections]
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
          convo={convo}
          selected={selected}
          onSelect={onSelect}
          hidden={hidden}
          linkBase={linkBase}
        />
      );
    },
    [selections, onSelect, hidden, linkBase]
  );

  const nextPageFetcher = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const Footer = useCallback(() => {
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

  const EmptyPlaceholder = useCallback(
    () =>
      isLoading ? (
        <div className="flex h-full w-full items-center justify-center gap-2 text-center font-bold">
          <SpinnerGap
            className="size-4 animate-spin"
            size={16}
          />
          Loading...
        </div>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
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
      ),
    [hidden, isLoading]
  );

  const computeItemKey = useCallback(
    (_: number, data: Convo) => data.publicId,
    []
  );

  return (
    <div className="flex h-full flex-col">
      <Virtuoso
        data={convos}
        increaseViewportBy={500}
        itemContent={itemRenderer}
        endReached={nextPageFetcher}
        computeItemKey={computeItemKey}
        components={{ Footer, EmptyPlaceholder }}
        style={{ overscrollBehavior: 'contain', overflowX: 'clip' }}
      />
    </div>
  );
}

type MemoizedConvoItemProps = {
  convo: Convo;
  selected: boolean;
  hidden: boolean;
  linkBase: string;
  onSelect: (convo: Convo, shiftKey: boolean, selected: boolean) => void;
};

const MemoizedConvoItem = memo(function AnimatedConvoItem({
  convo,
  selected,
  onSelect,
  hidden,
  linkBase
}: MemoizedConvoItemProps) {
  return (
    <AnimatePresence mode="sync">
      <motion.div
        layout
        className="py-0.5"
        transition={{ duration: 0.2, type: 'spring' }}>
        <ConvoItem
          convo={convo}
          selected={selected}
          onSelect={(shiftKey) => onSelect(convo, shiftKey, selected)}
          hidden={hidden}
          linkBase={linkBase}
        />
      </motion.div>
    </AnimatePresence>
  );
});
