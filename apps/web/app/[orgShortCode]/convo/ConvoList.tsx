'use client';

import { type RouterOutputs, api } from '@/lib/trpc';
import { useGlobalStore } from '@/providers/global-store-provider';
import { Flex, ScrollArea, Text } from '@radix-ui/themes';
import { useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import useTimeAgo from '@/hooks/use-time-ago';
import { formatParticipantData } from './utils';
import Link from 'next/link';
import AvatarPlus from '@/components/avatar-plus';

export default function ConvoList() {
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
      includeHidden: false,
      orgShortCode
    },
    {
      initialCursor: {},
      getNextPageParam: (lastPage) => lastPage.cursor ?? undefined
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
    <Flex className="bg-slate-2 dark:bg-slatedark-2 h-full w-[400px] overflow-x-hidden">
      {isLoading ? (
        <div className="w-full text-center font-bold">Loading...</div>
      ) : (
        <ScrollArea ref={scrollableRef}>
          <div
            className="relative w-full"
            style={{ height: `${convosVirtualizer.getTotalSize()}px` }}>
            {convosVirtualizer.getVirtualItems().map((virtualItem) => {
              const isLoader = virtualItem.index > allConvos.length - 1;
              const convo = allConvos[virtualItem.index]!;

              return (
                <div
                  key={virtualItem.index}
                  data-index={virtualItem.index}
                  className="absolute left-0 top-0 w-full py-1"
                  ref={convosVirtualizer.measureElement}
                  style={{
                    transform: `translateY(${virtualItem.start}px)`
                  }}>
                  {isLoader ? (
                    <div className="w-full text-center font-bold">
                      {hasNextPage ? 'Loading...' : ''}
                    </div>
                  ) : (
                    <div className="h-full">
                      <ConvoItem convo={convo} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </Flex>
  );
}

function ConvoItem({
  convo
}: {
  convo: RouterOutputs['convos']['getOrgMemberConvos']['data'][number];
}) {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);

  const timeAgo = useTimeAgo(convo.lastUpdatedAt);

  const author = convo.entries[0]?.author ?? convo.participants[0];

  const authorPublicId = useMemo(() => {
    if (!author) return null;
    return (
      author.orgMember?.publicId ??
      author.team?.publicId ??
      author.contact?.publicId ??
      null
    );
  }, [author]);

  const authorName = useMemo(() => {
    if (!author) return null;
    return (
      author.team?.name ??
      author.contact?.setName ??
      author.contact?.name ??
      `${author.orgMember?.profile.firstName ?? ''} ${author.orgMember?.profile.lastName ?? ''}`.trim() ??
      'Participant'
    );
  }, [author]);

  const participantData = useMemo(() => {
    const allParticipants = convo.participants
      .map((participant) => formatParticipantData(participant))
      .filter(Boolean) as NonNullable<
      ReturnType<typeof formatParticipantData>
    >[];
    const participantsWithoutAuthor = allParticipants.filter(
      (participant) => participant.typePublicId !== authorPublicId
    );
    const author = allParticipants.find(
      (participant) => participant.typePublicId === authorPublicId
    )!;
    return [author].concat(participantsWithoutAuthor);
  }, [convo.participants, authorPublicId]);

  return (
    <Link
      href={`/${orgShortCode}/convo/${convo.publicId}`}
      className="border-gray-12 flex h-full w-full gap-4 border-b p-2">
      <AvatarPlus
        size="4"
        imageSize="lg"
        users={participantData}
      />
      <Flex
        direction="column"
        className="w-full"
        gap="1">
        <Text
          className="w-full overflow-hidden pl-2 text-left"
          size="1"
          weight="bold">
          <span className="truncate text-xs">{convo.subjects[0]?.subject}</span>
        </Text>
        <div className="dark:bg-graydark-3 dark:hover:bg-graydark-4 dark:text-graydark-11 w-full rounded-lg p-1 text-left text-sm">
          <span className="line-clamp-2">
            <Text weight="bold">{authorName}</Text>:{' '}
            <Text className="w-full overflow-ellipsis break-words">
              {convo.entries[0]?.bodyPlainText ?? ''}
            </Text>
          </span>
        </div>
        <div className="mt-1 flex w-full flex-row items-center justify-end gap-1">
          <Text className="dark:text-graydark-11 min-w-fit overflow-hidden text-right text-xs">
            {timeAgo}
          </Text>
        </div>
      </Flex>
    </Link>
  );
}
