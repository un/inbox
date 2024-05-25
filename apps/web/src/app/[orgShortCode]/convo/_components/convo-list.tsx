'use client';

import { type RouterOutputs, api } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import useTimeAgo from '@/src/hooks/use-time-ago';
import { formatParticipantData } from '../utils';
import Link from 'next/link';
import AvatarPlus from '@/src/components/avatar-plus';
import { Button } from '@/src/components/shadcn-ui/button';
import { ms } from '@u22n/utils/ms';

export default function ConvoList() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const scrollableRef = useRef(null);
  const [showHidden, setShowHidden] = useState(false);

  const {
    data: convos,
    fetchNextPage,
    isLoading,
    hasNextPage,
    isFetchingNextPage
  } = api.convos.getOrgMemberConvos.useInfiniteQuery(
    {
      orgShortCode,
      includeHidden: showHidden ? true : undefined
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
    <div className="bg-sand-1 flex h-full w-full flex-col border-r p-4">
      {isLoading ? (
        <div className="w-full text-center font-bold">Loading...</div>
      ) : (
        <>
          {/* TODO: Replace this according to designs later */}
          <div className="flex w-full pb-2">
            <Button
              onClick={() => setShowHidden((prev) => !prev)}
              variant="secondary">
              {showHidden ? 'Show Normal Convos' : 'Show Hidden Convos'}
            </Button>
          </div>
          <div
            className="h-full max-h-full w-full max-w-full overflow-y-auto overflow-x-hidden"
            ref={scrollableRef}>
            <div
              className="relative flex w-full max-w-full flex-col overflow-hidden"
              style={{ height: `${convosVirtualizer.getTotalSize()}px` }}>
              {convosVirtualizer.getVirtualItems().map((virtualItem) => {
                const isLoader = virtualItem.index > allConvos.length - 1;
                const convo = allConvos[virtualItem.index]!;

                return (
                  <div
                    key={virtualItem.index}
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
      className=" flex h-full w-full max-w-full gap-4">
      <AvatarPlus
        size="4"
        imageSize="lg"
        users={participantData}
      />
      <div className="flex w-full flex-1 flex-col">
        <span className="w-full truncate pl-2 text-left">
          {convo.subjects[0]?.subject}
        </span>
        <div className="dark:bg-graydark-3 dark:hover:bg-graydark-4 dark:text-graydark-11 w-full rounded-lg p-1 text-left text-sm">
          <span className="line-clamp-2">
            <span>{authorName}</span>:{' '}
            <span className="w-full max-w-full overflow-ellipsis break-words">
              {convo.entries[0]?.bodyPlainText ?? ''}
            </span>
          </span>
        </div>
        <div className="mt-1 flex w-full flex-row items-center justify-end gap-1">
          <span className="dark:text-graydark-11 min-w-fit overflow-hidden text-right text-xs">
            {timeAgo}
          </span>
        </div>
      </div>
    </Link>
  );
}
