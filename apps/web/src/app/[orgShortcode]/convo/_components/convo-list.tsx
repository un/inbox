'use client';

import { useGlobalStore } from '@/src/providers/global-store-provider';
import { SpinnerGap } from '@phosphor-icons/react';
import { ConvoItem } from './convo-list-item';
import { platform } from '@/src/lib/trpc';
import { Virtuoso } from 'react-virtuoso';
import { ms } from '@u22n/utils/ms';
import { useCallback } from 'react';

type Props = {
  hidden: boolean;
};

export function ConvoList(props: Props) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);

  const {
    data: convos,
    fetchNextPage,
    isLoading,
    hasNextPage,
    isFetchingNextPage
  } = platform.convos.getOrgMemberConvos.useInfiniteQuery(
    {
      orgShortcode,
      includeHidden: props.hidden ? true : undefined
    },
    {
      getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
      staleTime: ms('1 hour')
    }
  );

  const allConvos = convos ? convos.pages.flatMap(({ data }) => data) : [];

  const itemRenderer = useCallback(
    (index: number, convo: (typeof allConvos)[number]) => {
      return (
        <div key={convo.publicId}>
          <ConvoItem convo={convo} />
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
    [allConvos.length, hasNextPage]
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
      ) : (
        <Virtuoso
          data={allConvos}
          itemContent={itemRenderer}
          style={{ overscrollBehavior: 'contain', overflowX: 'clip' }}
          endReached={async () => {
            if (hasNextPage && !isFetchingNextPage) await fetchNextPage();
          }}
          increaseViewportBy={100}
        />
      )}
    </div>
  );
}
