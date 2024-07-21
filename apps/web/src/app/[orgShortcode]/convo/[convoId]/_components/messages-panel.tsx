'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal
} from '@/src/components/shadcn-ui/dropdown-menu';
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { type JSONContent, generateHTML } from '@u22n/tiptap/react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { OriginalMessageView } from './original-message-view';
import { DotsThree, SpinnerGap } from '@phosphor-icons/react';
import { type RouterOutputs, platform } from '@/src/lib/trpc';
import { Button } from '@/src/components/shadcn-ui/button';
import { tipTapExtensions } from '@u22n/tiptap/extensions';
import { Badge } from '@/src/components/shadcn-ui/badge';
import { type formatParticipantData } from '../../utils';
import { useCopyToClipboard } from '@uidotdev/usehooks';
import { useTimeAgo } from '@/src/hooks/use-time-ago';
import { Avatar } from '@/src/components/avatar';
import { type TypeId } from '@u22n/utils/typeid';
import { cva } from 'class-variance-authority';
import { replyToMessageAtom } from '../atoms';
import { useAtom, useSetAtom } from 'jotai';
import { cn } from '@/src/lib/utils';
import { ms } from '@u22n/utils/ms';
import { toast } from 'sonner';

type MessagesPanelProps = {
  convoId: TypeId<'convos'>;
  participantOwnPublicId: TypeId<'convoParticipants'>;
  formattedParticipants: NonNullable<
    ReturnType<typeof formatParticipantData>
  >[];
};

export const MessagesPanel = forwardRef<VirtuosoHandle, MessagesPanelProps>(
  ({ convoId, participantOwnPublicId, formattedParticipants }, ref) => {
    const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
    // This is the index of the first item in the list. It is set to a high number to ensure that the list starts at the bottom
    // This also means the list can't be longer than 10000 items (which is fine for our most cases)
    const INVERSE_LIST_START_INDEX = 10000;
    const [firstItemIndex, setFirstItemIndex] = useState(
      INVERSE_LIST_START_INDEX
    );

    const setReplyTo = useSetAtom(replyToMessageAtom);

    const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
      platform.convos.entries.getConvoEntries.useInfiniteQuery(
        {
          convoPublicId: convoId,
          orgShortcode
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
      setReplyTo(lastMessage?.publicId ?? null);
    }, [allMessages, setReplyTo]);

    const itemRenderer = useCallback(
      (index: number, message: (typeof allMessages)[number]) => (
        <div key={message.publicId}>
          {index === firstItemIndex && hasNextPage ? (
            <div className="flex w-full items-center justify-center gap-2 text-center font-bold">
              <SpinnerGap
                className="size-4 animate-spin"
                size={16}
              />
              Loading...
            </div>
          ) : null}
          <MessageItem
            message={message}
            participantOwnPublicId={participantOwnPublicId}
            formattedParticipants={formattedParticipants}
          />
        </div>
      ),
      [
        participantOwnPublicId,
        formattedParticipants,
        firstItemIndex,
        hasNextPage
      ]
    );

    return isLoading ? (
      <div className="flex h-full flex-1 items-center justify-center gap-2 font-bold">
        <SpinnerGap
          className="size-4 animate-spin"
          size={16}
        />
        <span>Loading...</span>
      </div>
    ) : (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 py-1">
        <Virtuoso
          startReached={() => {
            if (isFetchingNextPage || !hasNextPage) return;
            void fetchNextPage();
          }}
          data={allMessages}
          initialTopMostItemIndex={Math.max(0, allMessages.length - 1)}
          firstItemIndex={firstItemIndex}
          itemContent={itemRenderer}
          style={{ overscrollBehavior: 'none', overflowX: 'clip' }}
          className="w-full"
          increaseViewportBy={100}
          ref={ref}
        />
      </div>
    );
  }
);

MessagesPanel.displayName = 'MessagesPanel';

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
    new Date().getTime() - message.createdAt.getTime() < ms('1 day');
  const timeAgo = useTimeAgo(message.createdAt);

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
              <span className="text-base-11 text-xs leading-none">
                {timeAgo}
              </span>
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
      <DropdownMenu>
        <DropdownMenuTrigger
          className="opacity-0 group-hover:opacity-100"
          asChild>
          <Button
            variant="secondary"
            size="icon-sm"
            className="mx-1 self-center">
            <DotsThree size={12} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent sideOffset={5}>
            <DropdownMenuItem
              className="flex justify-between"
              onClick={() => {
                setReplyTo(
                  replyTo === message.publicId ? null : message.publicId
                );
              }}>
              Reply{' '}
              {replyTo === message.publicId ? (
                <Badge variant="outline">Replying</Badge>
              ) : null}
            </DropdownMenuItem>
            {message.rawHtml?.wipeDate && (
              <DropdownMenuItem onClick={() => setViewingOriginalMessage(true)}>
                View Original Message
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={async () => {
                await copyToClipboard(message.publicId);
                toast.success('Message ID copied to clipboard');
              }}>
              Copy Message ID
            </DropdownMenuItem>
            <DropdownMenuItem>Report Bug</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
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
        className="prose dark:prose-invert prose-a:decoration-blue-9 text-base-12 w-fit overflow-clip break-words"
      />
    );
  },
  (prev, curr) => prev.html === curr.html
);
