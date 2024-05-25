'use client';

import { api } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ms } from '@u22n/utils/ms';
import { ConvoItem } from './convo-list-item';

type Props = {
  hidden: boolean;
};

export function ConvoList(props: Props) {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const scrollableRef = useRef(null);
  const {
    data: convos,
    fetchNextPage,
    isLoading,
    hasNextPage,
    isFetchingNextPage
  } = api.convos.getOrgMemberConvos.useInfiniteQuery(
    {
      orgShortCode,
      includeHidden: props.hidden ? true : undefined
    },
    {
      getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
      staleTime: ms('1 hour')
    }
  );

  const allConvos = convos ? convos.pages.flatMap(({ data }) => data) : [];
  const convosVirtualizer = useVirtualizer({
    count: allConvos.length + (hasNextPage ? 1 : 0),
    estimateSize: () => 115,
    getScrollElement: () => scrollableRef.current,
    overscan: 3
  });

  useEffect(() => {
    const lastItem = convosVirtualizer.getVirtualItems().at(-1);
    if (!lastItem) return;
    if (
      lastItem.index >= allConvos.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fetchNextPage,
    hasNextPage,
    allConvos.length,
    isFetchingNextPage,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    convosVirtualizer.getVirtualItems()
  ]);

  return (
    <div className="flex h-full w-full flex-col overflow-visible">
      {isLoading ? (
        <div className="w-full text-center font-bold">Loading...</div>
      ) : (
        <>
          <div
            className="h-full max-h-full w-full max-w-full scale-100 overflow-y-auto"
            ref={scrollableRef}>
            <div
              className="relative flex w-full max-w-full flex-col"
              style={{ height: `${convosVirtualizer.getTotalSize()}px` }}>
              {convosVirtualizer.getVirtualItems().map((virtualItem) => {
                const isLoader = virtualItem.index > allConvos.length - 1;
                const convo = allConvos[virtualItem.index]!;

                return (
                  <div
                    key={convo.publicId}
                    data-index={virtualItem.index}
                    className="absolute left-0 top-0 w-full"
                    ref={convosVirtualizer.measureElement}
                    style={{
                      transform: `translateY(${virtualItem.start}px)`
                    }}>
                    {isLoader ? (
                      <div className="w-full text-center font-bold">
                        {hasNextPage ? 'Loading...' : ''}
                      </div>
                    ) : (
                      <div className="h-full w-full">
                        <ConvoItem convo={convo} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
