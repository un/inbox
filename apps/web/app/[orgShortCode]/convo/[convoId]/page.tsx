'use client';

import { type RouterOutputs, api } from '@/lib/trpc';
import {
  Avatar,
  Button,
  DropdownMenu,
  Flex,
  IconButton,
  ScrollArea,
  Text,
  Badge
} from '@radix-ui/themes';
import Link from 'next/link';
import { type TypeId, validateTypeId } from '@u22n/utils';
import { useGlobalStore } from '@/providers/global-store-provider';
import { memo, useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type JSONContent, generateHTML } from '@u22n/tiptap/react';
import { tipTapExtensions } from '@u22n/tiptap/extensions';
import { formatParticipantData } from '../utils';
import { cn, generateAvatarUrl, getInitials } from '@/lib/utils';
import ChatSideBar from './ChatSideBar';
import useTimeAgo from '@/hooks/use-time-ago';
import { Ellipsis } from 'lucide-react';
import { atom, useAtom } from 'jotai';
import { useCopyToClipboard } from '@uidotdev/usehooks';
import { toast } from 'sonner';

const replyToMessageAtom = atom<null | TypeId<'convoEntries'>>(null);

export default function Page({
  params: { convoId }
}: {
  params: { convoId: string };
}) {
  if (!validateTypeId('convos', convoId)) {
    return <ConvoNotFound />;
  }
  return <ConvoView convoId={convoId} />;
}

function ConvoView({ convoId }: { convoId: TypeId<'convos'> }) {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const scrollableRef = useRef<HTMLDivElement | null>(null);

  const { data: convoData, isLoading: convoDataLoading } =
    api.convos.getConvo.useQuery({
      orgShortCode,
      convoPublicId: convoId
    });

  const {
    data,
    status,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = api.convos.entries.getConvoEntries.useInfiniteQuery(
    {
      convoPublicId: convoId,
      orgShortCode
    },
    {
      initialCursor: {},
      getNextPageParam: (lastPage) => lastPage.cursor ?? undefined
    }
  );

  const allMessages = data ? data.pages.flatMap(({ entries }) => entries) : [];

  const messagesVirtualizer = useVirtualizer({
    count: allMessages.length + (hasNextPage ? 1 : 0),
    estimateSize: () => 500,
    getScrollElement: () => scrollableRef.current,
    overscan: 1,
    gap: 30
  });

  useEffect(() => {
    const lastItem = messagesVirtualizer.getVirtualItems().at(-1);
    if (!lastItem) return;
    if (
      lastItem.index >= allMessages.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fetchNextPage,
    hasNextPage,
    allMessages.length,
    isFetchingNextPage,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    messagesVirtualizer.getVirtualItems()
  ]);

  // Inverse Scroll Handler
  useEffect(() => {
    const handleScroll = (e: WheelEvent) => {
      e.preventDefault();
      const currentTarget = e.currentTarget as HTMLDivElement;
      if (currentTarget) {
        currentTarget.scrollTop -= e.deltaY;
      }
    };

    const scrollable = scrollableRef.current;
    scrollable?.addEventListener('wheel', handleScroll, {
      passive: false
    });
    return () => {
      scrollable?.removeEventListener('wheel', handleScroll);
    };
  }, [status]);

  const participantOwnPublicId = convoData?.ownParticipantPublicId;

  const allParticipants = useMemo(() => {
    const formattedParticipants: NonNullable<
      ReturnType<typeof formatParticipantData>
    >[] = [];
    if (convoData?.data.participants) {
      for (const participant of convoData.data.participants) {
        const formattedParticipant = formatParticipantData(participant);
        if (!formattedParticipant) continue;
        formattedParticipants.push(formattedParticipant);
      }
    }
    return formattedParticipants;
  }, [convoData?.data.participants]);

  return (
    <Flex className="h-full w-full">
      <Flex
        direction="column"
        className="h-full w-full flex-1">
        <Text>Convo Page</Text>

        {isLoading || convoDataLoading ? (
          <div className="h-full flex-1">Loading...</div>
        ) : (
          <ScrollArea
            ref={scrollableRef}
            className="h-full w-full flex-1"
            style={{ transform: 'scaleY(-1)' }}>
            <div
              className="relative w-full"
              style={{ height: `${messagesVirtualizer.getTotalSize()}px` }}>
              {messagesVirtualizer.getVirtualItems().map((virtualItem) => {
                const isLoader = virtualItem.index > allMessages.length - 1;
                const message = allMessages[virtualItem.index]!;

                return (
                  <div
                    key={virtualItem.index}
                    data-index={virtualItem.index}
                    className="absolute left-0 top-0 w-full py-1"
                    ref={messagesVirtualizer.measureElement}
                    style={{
                      transform: `translateY(${virtualItem.start}px) scaleY(-1)`
                    }}>
                    {isLoader ? (
                      <div className="w-full text-center font-bold">
                        {hasNextPage ? 'Loading...' : ''}
                      </div>
                    ) : (
                      <div className="h-full px-8">
                        <MessageItem
                          message={message}
                          participantOwnPublicId={participantOwnPublicId!}
                          allParticipants={allParticipants}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
        <Flex className="h-20">Editor box</Flex>
      </Flex>
      <ChatSideBar />
    </Flex>
  );
}

function MessageItem({
  message,
  participantOwnPublicId,
  allParticipants
}: {
  message: RouterOutputs['convos']['entries']['getConvoEntries']['entries'][number];
  participantOwnPublicId: string;
  allParticipants: NonNullable<ReturnType<typeof formatParticipantData>>[];
}) {
  const messageHtml = useMemo(
    () => generateHTML(message.body as JSONContent, tipTapExtensions),
    [message.body]
  );
  const isUserAuthor = message.author.publicId === participantOwnPublicId;
  const messageAuthor = useMemo(
    () =>
      allParticipants.find(
        (p) => p.participantPublicId === message.author.publicId
      )!,
    [allParticipants, message.author.publicId]
  );
  const timeAgo = useTimeAgo(message.createdAt);
  const [replyTo, setReplyTo] = useAtom(replyToMessageAtom);
  const [, copyToClipboard] = useCopyToClipboard();

  return (
    <Flex
      className={cn(
        'w-full gap-2',
        isUserAuthor ? 'flex-row-reverse' : 'flex-row'
      )}>
      <Avatar
        src={
          generateAvatarUrl({
            avatarTimestamp: messageAuthor.avatarTimestamp,
            publicId: messageAuthor.avatarProfilePublicId,
            size: 'lg'
          }) ?? undefined
        }
        fallback={getInitials(messageAuthor.name)}
        radius="full"
        size="4"
      />
      <Flex
        direction="column"
        gap="1"
        className="w-fit">
        <Text className={cn(isUserAuthor ? 'text-right' : 'text-left')}>
          {messageAuthor.name}{' '}
          {message.metadata?.email?.from?.[0]?.email ? (
            <Text color="gray">
              - via {message.metadata.email.from[0].email})
            </Text>
          ) : null}
        </Text>
        <Flex
          className={cn(
            'w-full rounded-lg p-2',
            isUserAuthor ? 'bg-blue-10' : 'bg-gray-11'
          )}>
          <HTMLMessage html={messageHtml} />
        </Flex>
        <Text
          color="gray"
          size="1"
          className={cn(isUserAuthor ? 'text-right' : 'text-left')}>
          {timeAgo}
        </Text>
      </Flex>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <IconButton
            variant="soft"
            size="1"
            className="mx-1 self-center">
            <Ellipsis size={12} />
          </IconButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content sideOffset={5}>
          <DropdownMenu.Item
            className="flex justify-between"
            onClick={() => {
              setReplyTo(
                replyTo === message.publicId ? null : message.publicId
              );
            }}>
            Reply{' '}
            {replyTo === message.publicId ? (
              <Badge variant="soft">Replying</Badge>
            ) : null}
          </DropdownMenu.Item>
          {message.rawHtml?.wipeDate && (
            <DropdownMenu.Item>View Original Message</DropdownMenu.Item>
          )}
          <DropdownMenu.Item
            onClick={async () => {
              await copyToClipboard(message.publicId);
              toast.success('Message ID copied to clipboard');
            }}>
            Copy Message ID
          </DropdownMenu.Item>
          <DropdownMenu.Item>Report Bug</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Flex>
  );
}

// It is important to memoize the HTMLMessage component to prevent unnecessary re-renders which can cause infinite fetch loops for images
const HTMLMessage = memo(
  function MemoedMessage({ html }: { html: string }) {
    const emptyMessage = `<span class="text-base-11 text-sm">THIS MESSAGE CONTAINS NO VALID TEXT CONTENT</span>`;
    const __html = html === '<p></p>' ? emptyMessage : html;
    return (
      <div
        dangerouslySetInnerHTML={{ __html }}
        className="w-full"
      />
    );
  },
  (prev, curr) => prev.html === curr.html
);

function ConvoNotFound() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  return (
    <Flex
      className="h-full w-full"
      align="center"
      justify="center">
      <Flex
        direction="column"
        gap="2"
        align="center">
        <Text weight="bold">Convo Not Found</Text>
        <Text size="1">
          The convo you are looking for does not exist. Please check the URL and
          try again.
        </Text>
        <Link href={`/${orgShortCode}/convo`}>
          <Button>Go back to Convos</Button>
        </Link>
      </Flex>
    </Flex>
  );
}
