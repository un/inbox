'use client';

import {
  useOrgScopedRouter,
  useOrgShortcode,
  useSpaceShortcode
} from '@/src/hooks/use-params';
import { ConvoListBase } from '../../../convo/_components/convo-list-base';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { platform } from '@/src/lib/trpc';
import { ms } from '@u22n/utils/ms';

type Props = {
  hidden: boolean;
};

export function ConvoList({ hidden }: Props) {
  const orgShortcode = useOrgShortcode();
  const spaceShortcode = useSpaceShortcode();
  const { scopedUrl } = useOrgScopedRouter();
  const router = useRouter();

  const {
    data: convos,
    fetchNextPage,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    error
  } = platform.spaces.getSpaceConvos.useInfiniteQuery(
    {
      orgShortcode,
      spaceShortcode,
      includeHidden: hidden ? true : undefined
    },
    {
      getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
      staleTime: ms('1 hour')
    }
  );

  const allConvos = useMemo(
    () => (convos ? convos?.pages.flatMap((page) => page.data) : []),
    [convos]
  );

  useEffect(() => {
    if (error?.data?.code === 'FORBIDDEN') {
      router.push(scopedUrl('/personal/convo'));
    }
  }, [error, router, scopedUrl]);

  return (
    <ConvoListBase
      hidden={hidden}
      convos={allConvos}
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      linkBase={`/${orgShortcode}/${spaceShortcode}/convo`}
    />
  );
}
