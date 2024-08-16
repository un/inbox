'use client';

import { useOrgShortcode } from '@/src/hooks/use-params';
import { ConvoListBase } from './convo-list-base';
import { ConvoItem } from './convo-list-item';
import { platform } from '@/src/lib/trpc';
import { ms } from '@u22n/utils/ms';

type Props = {
  hidden: boolean;
};

export function ConvoList(props: Props) {
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
        <ConvoItem
          {...itemProps}
          link={`/${orgShortcode}/convo/${itemProps.convo.publicId}`}
        />
      )}
    />
  );
}
