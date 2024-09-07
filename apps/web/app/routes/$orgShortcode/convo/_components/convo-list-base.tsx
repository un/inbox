import { convoListSelection, lastSelectedConvo } from '../atoms';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSpaceShortcode } from '@/hooks/use-params';
import { useOrgShortcode } from '@/hooks/use-params';
import { SpinnerGap } from '@phosphor-icons/react';
import { type TypeId } from '@u22n/utils/typeid';
import { ConvoItem } from './convo-list-item';
import { Virtuoso } from 'react-virtuoso';
import { Link } from '@remix-run/react';
import { type Convo } from '../utils';
import { useAtom } from 'jotai';

type ConvoListBaseProps = {
  // hidden: boolean;
  convos: Convo[];
  isLoading: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  linkBase: string;
  fetchNextPage: () => Promise<unknown>;
};

export function ConvoListBase({
  // hidden,
  convos,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  linkBase
}: ConvoListBaseProps) {
  const orgShortcode = useOrgShortcode();
  const spaceShortcode = useSpaceShortcode();
  const [selections, setSelections] = useAtom(convoListSelection);
  const [lastSelected, setLastSelected] = useAtom(lastSelectedConvo);

  // Reset selections when space changes to avoid cross-space selections
  useEffect(() => {
    setSelections([]);
    setLastSelected(null);
  }, [setLastSelected, setSelections, spaceShortcode]);

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
          // hidden={hidden}
          linkBase={linkBase}
        />
      );
    },
    [selections, onSelect, linkBase]
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

  const EmptyPlaceholder = useCallback(() => {
    const welcomeLink = `/${orgShortcode}/${spaceShortcode ?? 'personal'}/convo/welcome`;

    return isLoading ? (
      <div className="flex h-full w-full items-center justify-center gap-2 text-center font-bold">
        <SpinnerGap
          className="size-4 animate-spin"
          size={16}
        />
        Loading...
      </div>
    ) : (
      <div className="py-0.5">
        <Link
          to={welcomeLink}
          className="block">
          <div className="hover:border-base-6 group flex h-full flex-row gap-2 overflow-visible rounded-xl border-2 border-transparent px-2 py-3">
            <div className="contents">
              <div className="bg-accent-2 shift-key:group-hover:block hidden size-6 rounded-lg border"></div>
              <div className="shift-key:group-hover:hidden">
                <div className="relative h-fit w-fit scale-100 overflow-visible">
                  <div className="bg-accent-5 text-accent-11 flex aspect-square h-6 w-6 items-center justify-center overflow-hidden rounded-md text-xs font-medium">
                    <span className="flex h-full w-full items-center justify-center rounded-md">
                      UT
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex w-[90%] flex-1 flex-col">
              <div className="flex flex-row items-end justify-between gap-1">
                <span className="truncate text-sm font-medium">
                  Uninbox Team
                </span>
              </div>
              <span className="truncate break-all text-left text-xs font-medium">
                First steps with uninbox
              </span>
              <div className="flex flex-row items-start justify-start gap-1 text-left text-sm">
                <div className="px-0.5">
                  <span className="bg-accent-5 text-accent-11 relative flex aspect-square h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-sm text-[9px] font-medium">
                    <span className="flex h-full w-full items-center justify-center rounded-md">
                      UT
                    </span>
                  </span>
                </div>
                <span className="line-clamp-2 overflow-clip break-words">
                  Welcome to Uninbox! Here you&apos;ll see your conversations.
                  Start by connecting your email or creating a new conversation.
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    );
  }, [isLoading, orgShortcode, spaceShortcode]);

  const computeItemKey = useCallback(
    (_: number, data: Convo) => data.publicId,
    []
  );

  const ConvoList = useMemo(
    () => (
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
    ),
    [
      EmptyPlaceholder,
      Footer,
      computeItemKey,
      convos,
      itemRenderer,
      nextPageFetcher
    ]
  );

  return ConvoList;
}

type MemoizedConvoItemProps = {
  convo: Convo;
  selected: boolean;
  // hidden: boolean;
  linkBase: string;
  onSelect: (convo: Convo, shiftKey: boolean, selected: boolean) => void;
};

const MemoizedConvoItem = memo(function AnimatedConvoItem({
  convo,
  selected,
  onSelect,
  // hidden,
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
          // hidden={hidden}
          linkBase={linkBase}
        />
      </motion.div>
    </AnimatePresence>
  );
});
