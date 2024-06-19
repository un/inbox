'use client';

import { type RouterOutputs, api } from '@/src/lib/trpc';
import {
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
import { cn } from '@/src/lib/utils';
import { DotsThree } from '@phosphor-icons/react';
import { useAtom } from 'jotai';
import { useCopyToClipboard } from '@uidotdev/usehooks';
import { toast } from 'sonner';
import { Virtuoso } from 'react-virtuoso';
import { replyToMessageAtom } from '../atoms';
import { ms } from '@u22n/utils/ms';
import { Avatar } from '@/src/components/avatar';
import { cva } from 'class-variance-authority';
import { OriginalMessageView } from './original-message-view';

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
      <div className="h-full w-full">
        {index === firstItemIndex && hasNextPage ? (
          <div className="flex w-full items-center justify-center gap-2">
            <Spinner loading />
            <span>Loading...</span>
          </div>
        ) : null}
        <MessageItem
          message={message}
          participantOwnPublicId={participantOwnPublicId}
          formattedParticipants={formattedParticipants}
          key={message.publicId}
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
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4">
      <ScrollArea
        ref={setScrollParent}
        className="pb-4">
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
          className=""
        />
      </ScrollArea>
    </div>
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
  const [replyTo, setReplyTo] = useAtom(replyToMessageAtom);
  const [, copyToClipboard] = useCopyToClipboard();
  const [viewingOriginalMessage, setViewingOriginalMessage] = useState(false);

  // if the message timestamp is less than a day ago, show the date instead of the time
  const isRecent =
    new Date().getTime() - message.createdAt.getTime() < 24 * 60 * 60 * 1000;

  const viaAddress = message.metadata?.email?.from?.[0]?.email;

  // styling
  const messageStyling = cva('…', {
    variants: {
      type: {
        message: 'rounded-2xl',
        comment: '',
        draft: 'rounded-none'
      },
      author: { true: '', false: '' }
    },
    compoundVariants: [
      {
        type: 'message',
        author: true,
        class: 'bg-accent-3 rounded-tr-sm'
      },
      {
        type: 'message',
        author: false,
        class: 'bg-base-3 rounded-tl-sm'
      },
      {
        type: 'comment',
        author: true,
        class: 'bg-amber-3 border-amber-5 border-r-2 rounded-l-md'
      },
      {
        type: 'comment',
        author: false,
        class: 'bg-amber-2 border-amber-5 border-l-2 rounded-r-md'
      }
    ]
  });

  return (
    <div
      className={cn(
        'group my-6 flex w-full gap-2',
        isUserAuthor ? 'flex-row-reverse' : 'flex-row'
      )}>
      <div
        className={cn(
          isUserAuthor ? 'items-end' : 'items-start',
          'flex w-fit max-w-prose flex-col gap-2 overflow-x-hidden'
        )}>
        <div
          className={cn(
            'flex w-full items-center gap-2',
            isUserAuthor ? 'flex-row-reverse' : 'flex-row'
          )}>
          <Avatar
            avatarProfilePublicId={messageAuthor.avatarProfilePublicId}
            avatarTimestamp={messageAuthor.avatarTimestamp}
            name={messageAuthor.name}
            color={messageAuthor.color}
            hideTooltip
            size="xl"
          />
          <div
            className={cn(
              isUserAuthor ? 'flex-row-reverse' : 'flex-row',
              viaAddress ? 'items-end' : 'items-center',
              'flex gap-2'
            )}>
            <div
              className={cn(
                'flex flex-col gap-1',
                isUserAuthor ? 'items-end' : 'items-start'
              )}>
              <span className="text-base font-medium leading-none">
                {messageAuthor.name}
              </span>
              {viaAddress ? (
                <span className="text-base-11 text-xs leading-none">
                  via {viaAddress}
                </span>
              ) : null}
            </div>
          </div>
          <div className={cn(isUserAuthor ? 'mr-4' : 'ml-4')}>
            {isRecent ? (
              <span className="text-base-11 text-xs leading-none">timeAgo</span>
            ) : (
              <div
                className={cn(
                  'flex flex-col gap-1',
                  isUserAuthor ? 'items-start' : 'items-end'
                )}>
                <span className="text-base-11 text-xs leading-none">
                  {message.createdAt.toLocaleDateString()}
                </span>
                <span className="text-base-11 text-xs leading-none">
                  {message.createdAt.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
        <div
          className={cn(
            'flex w-fit max-w-full flex-row overflow-hidden px-3 py-2',
            messageStyling({ type: message.type, author: isUserAuthor })
          )}>
          <HTMLMessage html={messageHtml} />
        </div>
      </div>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="opacity-0 group-hover:opacity-100">
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
            <DropdownMenu.Item onClick={() => setViewingOriginalMessage(true)}>
              View Original Message
            </DropdownMenu.Item>
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
      {viewingOriginalMessage && message.rawHtml?.wipeDate ? (
        <OriginalMessageView
          setOpen={setViewingOriginalMessage}
          messagePublicId={message.publicId}
        />
      ) : null}
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
        className="prose dark:prose-invert prose-a:decoration-blue-8 prose-img:my-1 text-base-12 w-full max-w-full overflow-clip break-words"
      />
    );
  },
  (prev, curr) => prev.html === curr.html
);
