'use client';

import { useGlobalStore } from '@/src/providers/global-store-provider';
import { ConvoItemWrapper } from './convo-item-wrapper';
import { ConvoListBase } from './convo-list-base';
import { platform } from '@/src/lib/trpc';
import { ms } from '@u22n/utils/ms';

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
  if (!convos) return null;
  const allConvos = convos.pages.flatMap((page) => page.data);

  return (
    <ConvoListBase
      hidden={props.hidden}
      convos={allConvos}
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      ConvoItem={(itemProps) => (
        <ConvoItemWrapper
          {...itemProps}
          isSpaceConvo={false}
        />
      )}
    />
  );
}
