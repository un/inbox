'use client';

import { ConvoListBase } from '../../../convo/_components/convo-list-base';
// import { ConvoListBase } from '../../convo/_components/convo-list-base';
import { ConvoItem } from '../../../convo/_components/convo-list-item';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useParams } from 'next/navigation';
import { platform } from '@/src/lib/trpc';
import { ms } from '@u22n/utils/ms';

type Props = {
  hidden: boolean;
};

export function ConvoList(props: Props) {
  const { spaceShortCode } = useParams();
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);

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
      includeHidden: props.hidden
    },
    {
      getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
      staleTime: ms('1 hour')
    }
  );

  return (
    <ConvoListBase
      hidden={props.hidden}
      convos={convos}
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      ConvoItem={ConvoItem}
    />
  );
}
