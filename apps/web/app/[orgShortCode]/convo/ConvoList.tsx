/* eslint-disable @typescript-eslint/no-unused-vars */

'use client';

import { api } from '@/lib/trpc';
import { Flex } from '@radix-ui/themes';

export default function ConvoList() {
  const {
    data: convos,
    fetchNextPage,
    isLoading,
    hasNextPage,
    isFetchingNextPage
  } = api.convos.getOrgMemberConvos.useInfiniteQuery(
    {
      includeHidden: false
    },
    {
      initialCursor: {},
      getNextPageParam: (lastPage) => lastPage.cursor ?? undefined
    }
  );

  return (
    <Flex className="bg-slate-2 dark:bg-slatedark-2 h-full w-[350px] p-2">
      {isLoading ? (
        <div>Loading...</div>
      ) : // Render the list of convos
      null}
    </Flex>
  );
}
