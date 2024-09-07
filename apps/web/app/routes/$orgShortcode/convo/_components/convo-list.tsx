import {
  useOrgScopedRouter,
  useOrgShortcode,
  useSpaceShortcode
} from '@/hooks/use-params';
import { ConvoListBase } from './convo-list-base';
import { useEffect, useMemo } from 'react';
import { platform } from '@/lib/trpc';
import { ms } from '@u22n/utils/ms';

// type Props = {
// hidden: boolean;
// };

export function ConvoList(/*{hidden} : Props*/) {
  const orgShortcode = useOrgShortcode();
  const spaceShortcode = useSpaceShortcode();
  const { scopedRedirect, scopedUrl } = useOrgScopedRouter();

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
      spaceShortcode: spaceShortcode ?? 'all'
      // includeHidden: hidden
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
      scopedRedirect('/personal/convo');
    }
  }, [error, scopedRedirect]);

  return (
    <ConvoListBase
      // hidden={hidden}
      convos={allConvos}
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      linkBase={scopedUrl('/convo', true)}
    />
  );
}
