'use client';

import { type RouterOutputs, api } from '@/src/lib/trpc';
import {
  Avatar,
  DropdownMenu,
  IconButton,
  ScrollArea,
  Badge,
  Spinner
} from '@radix-ui/themes';
import { type TypeId } from '@u22n/utils/typeid';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { type JSONContent, generateHTML } from '@u22n/tiptap/react';
import { tipTapExtensions } from '@u22n/tiptap/extensions';
import { type formatParticipantData } from '../../utils';
import { cn, generateAvatarUrl, getInitials } from '@/src/lib/utils';
import useTimeAgo from '@/src/hooks/use-time-ago';
import { DotsThree } from '@phosphor-icons/react';
import { useAtom } from 'jotai';
import { useCopyToClipboard } from '@uidotdev/usehooks';
import { toast } from 'sonner';
import { Virtuoso } from 'react-virtuoso';
import { replyToMessageAtom } from '../atoms';
import { ms } from '@u22n/utils/ms';

export function MessagesPanel({
  convoId,
  participantOwnPublicId,
  formattedParticipants
}: {
  convoId: TypeId<'convos'>;
  participantOwnPublicId: TypeId<'convoParticipants'>;
  formattedParticipants: NonNullable<
    ReturnType<typeof formatParticipantData>
  >[];
}) {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  // This is the index of the first item in the list. It is set to a high number to ensure that the list starts at the bottom
  // This also means the list can't be longer than 10000 items (which is fine for our most cases)
  const INVERSE_LIST_START_INDEX = 10000;
  const [firstItemIndex, setFirstItemIndex] = useState(
    INVERSE_LIST_START_INDEX
  );
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null);
  const [, setReplyTo] = useAtom(replyToMessageAtom);

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    api.convos.entries.getConvoEntries.useInfiniteQuery(
      {
        convoPublicId: convoId,
        orgShortCode
      },
      {
        getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
        staleTime: ms('1 hour')
      }
    );

  const allMessages = useMemo(() => {
    const messages = data
      ? data.pages.flatMap(({ entries }) => entries).reverse()
      : [];
    setFirstItemIndex(() => INVERSE_LIST_START_INDEX - messages.length);
    return messages;
  }, [data]);

  useEffect(() => {
    const lastMessage = allMessages.at(-1);
    setReplyTo(() => lastMessage?.publicId ?? null);
  }, [allMessages, setReplyTo]);

  const itemRenderer = useCallback(
    (index: number, message: (typeof allMessages)[number]) => (
      <div className="h-full w-full px-8 py-4">
        {index === firstItemIndex && hasNextPage ? (
          <div className="flex w-full items-center justify-center gap-2 p-2">
            <Spinner loading />
            <span>Loading...</span>
          </div>
        ) : null}
        <MessageItem
          message={message}
          participantOwnPublicId={participantOwnPublicId}
          formattedParticipants={formattedParticipants}
        />
      </div>
    ),
    [participantOwnPublicId, formattedParticipants, firstItemIndex, hasNextPage]
  );

  return isLoading ? (
    <div className="flex h-full flex-1 items-center justify-center font-bold">
      Loading...
    </div>
  ) : (
    <ScrollArea ref={setScrollParent}>
      <Virtuoso
        startReached={() => {
          if (isFetchingNextPage || !hasNextPage) return;
          void fetchNextPage();
        }}
        data={allMessages}
        initialTopMostItemIndex={Math.max(0, allMessages.length - 1)}
        firstItemIndex={firstItemIndex}
        itemContent={itemRenderer}
        customScrollParent={scrollParent ?? undefined}
        style={{ overscrollBehavior: 'contain' }}
      />
    </ScrollArea>
  );
}

function MessageItem({
  message,
  participantOwnPublicId,
  formattedParticipants
}: {
  message: RouterOutputs['convos']['entries']['getConvoEntries']['entries'][number];
  participantOwnPublicId: string;
  formattedParticipants: NonNullable<
    ReturnType<typeof formatParticipantData>
  >[];
}) {
  const messageHtml = useMemo(
    () => generateHTML(message.body as JSONContent, tipTapExtensions),
    [message.body]
  );
  const isUserAuthor = message.author.publicId === participantOwnPublicId;
  const messageAuthor = useMemo(
    () =>
      formattedParticipants.find(
        (p) => p.participantPublicId === message.author.publicId
      )!,
    [formattedParticipants, message.author.publicId]
  );
  const timeAgo = useTimeAgo(message.createdAt);
  const [replyTo, setReplyTo] = useAtom(replyToMessageAtom);
  const [, copyToClipboard] = useCopyToClipboard();

  return (
    <div
      className={cn(
        'flex w-full flex-row gap-2',
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
      <div className="flex w-fit  max-w-prose flex-col overflow-x-hidden">
        <span className={cn(isUserAuthor ? 'text-right' : 'text-left')}>
          {messageAuthor.name}{' '}
          {message.metadata?.email?.from?.[0]?.email ? (
            <span color="gray">
              - via {message.metadata.email.from[0].email}
            </span>
          ) : null}
        </span>
        <div
          className={cn(
            ' flex w-full max-w-full flex-row overflow-hidden rounded-lg p-2',
            isUserAuthor
              ? 'dark:bg-blue-10 bg-blue-8'
              : 'dark:bg-gray-10 bg-gray-8'
          )}>
          <HTMLMessage html={messageHtml} />
        </div>
        <span className={cn(isUserAuthor ? 'text-right' : 'text-left')}>
          {timeAgo}
        </span>
      </div>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <IconButton
            variant="soft"
            size="1"
            className="mx-1 self-center">
            <DotsThree size={12} />
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
    </div>
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
        className="prose dark:prose-invert prose-p:my-1 prose-a:decoration-blue-8 prose-img:my-1 w-full max-w-full overflow-clip break-words text-black dark:text-white"
      />
    );
  },
  (prev, curr) => prev.html === curr.html
);
