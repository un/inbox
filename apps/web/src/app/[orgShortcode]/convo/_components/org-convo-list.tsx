'use client';

import { useOrgShortcode } from '@/src/hooks/use-params';
import { ConvoListBase } from './convo-list-base';
import { platform } from '@/src/lib/trpc';
import { ms } from '@u22n/utils/ms';
import { useMemo } from 'react';

type Props = {
  hidden: boolean;
};

export function ConvoList({ hidden }: Props) {
  const orgShortcode = useOrgShortcode();

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

  const allConvos = useMemo(
    () => (convos ? convos.pages.flatMap((page) => page.data) : []),
    [convos]
  );

  return (
    <ConvoListBase
      hidden={hidden}
      convos={allConvos}
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      linkBase={`/${orgShortcode}/convo`}
    />
  );
}
