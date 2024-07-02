'use client';

import { api } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { ms } from '@u22n/utils/ms';
import { ConvoItem } from './convo-list-item';

type Props = {
  hidden: boolean;
};

export function ConvoList(props: Props) {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);

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

  const itemRenderer = useCallback(
    (index: number, convo: (typeof allConvos)[number]) => {
      return (
        <div key={convo.publicId}>
          <div className="h-full w-full">
            <ConvoItem convo={convo} />
          </div>
          {index === allConvos.length - 1 && hasNextPage && (
            <div className="w-full text-center font-bold">Loading...</div>
          )}
        </div>
      );
    },
    [allConvos.length, hasNextPage]
  );

  return (
    <div className="flex h-full w-full flex-col">
      {isLoading ? (
        <div className="w-full py-2 text-center font-bold">Loading...</div>
      ) : (
        <Virtuoso
          data={allConvos}
          itemContent={itemRenderer}
          style={{ overscrollBehavior: 'contain' }}
          endReached={async () => {
            if (hasNextPage && !isFetchingNextPage) await fetchNextPage();
          }}
        />
      )}
    </div>
  );
}
