'use client';

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState
} from 'react';
import {
  ArrowBendDoubleUpLeft,
  FileDashed,
  Hash,
  SpinnerGap
} from '@phosphor-icons/react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from '@/src/components/shadcn-ui/tooltip';
import { type JSONContent, generateHTML } from '@u22n/tiptap/react';
import { SmartDateTime } from '@/src/components/smart-date-time';
import { emailIdentityAtom, replyToMessageAtom } from '../atoms';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { OriginalMessageView } from './original-message-view';
import { type RouterOutputs, platform } from '@/src/lib/trpc';
import { createExtensionSet } from '@u22n/tiptap/extensions';
import { useOrgShortcode } from '@/src/hooks/use-params';
import { type formatParticipantData } from '../../utils';
import { cn, copyToClipboard } from '@/src/lib/utils';
import { Avatar } from '@/src/components/avatar';
import { type TypeId } from '@u22n/utils/typeid';
import { cva } from 'class-variance-authority';
import { ms } from '@u22n/utils/ms';
import { useAtom } from 'jotai';
import { toast } from 'sonner';

type MessagesPanelProps = {
  convoId: TypeId<'convos'>;
  participantOwnPublicId: TypeId<'convoParticipants'> | null;
  formattedParticipants: NonNullable<
    ReturnType<typeof formatParticipantData>
  >[];
};

export const MessagesPanel = memo(
  forwardRef<VirtuosoHandle, MessagesPanelProps>(
    ({ convoId, participantOwnPublicId, formattedParticipants }, ref) => {
      const orgShortcode = useOrgShortcode();
      // This is the index of the first item in the list. It is set to a high number to ensure that the list starts at the bottom
      // This also means the list can't be longer than 10000 items (which is fine for our most cases)
      const INVERSE_LIST_START_INDEX = 10000;
      const [firstItemIndex, setFirstItemIndex] = useState(
        INVERSE_LIST_START_INDEX
      );

      const [replyTo, setReplyTo] = useAtom(replyToMessageAtom);
      const [, setEmailIdentity] = useAtom(emailIdentityAtom);

      const { data: emailIdentities } =
        platform.org.mail.emailIdentities.getUserEmailIdentities.useQuery(
          {
            orgShortcode
          },
          {
            staleTime: ms('1 hour')
          }
        );

      const {
        data,
        isLoading,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage
      } = platform.convos.entries.getConvoEntries.useInfiniteQuery(
        {
          convoPublicId: convoId,
          orgShortcode
        },
        {
          getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
          staleTime: ms('1 hour')
        }
      );

      const [allMessages, setAllMessages] = useState<
        RouterOutputs['convos']['entries']['getConvoEntries']['entries']
      >([]);

      useLayoutEffect(() => {
        const messages = data
          ? data.pages.flatMap(({ entries }) => entries).reverse()
          : [];
        setFirstItemIndex(() => INVERSE_LIST_START_INDEX - messages.length);
        setAllMessages(messages);
      }, [data]);

      useEffect(() => {
        const lastMessage = allMessages.at(-1);
        setReplyTo(lastMessage?.publicId ?? null);
      }, [allMessages, setReplyTo]);

      useEffect(() => {
        const emailEntry = allMessages.find((_) => _.publicId === replyTo);
        if (emailEntry) {
          const metaData = emailEntry.metadata;
          if (!emailIdentities) return;
          let newEmailIdentity: TypeId<'emailIdentities'> | null = null;
          for (const key of ['to', 'from', 'cc'] as const) {
            const addressPublicIds = metaData?.email?.[key]
              .filter((_) => _.type === 'emailIdentity')
              .map((_) => _.publicId);

            const foundPublicId = addressPublicIds?.find((id) =>
              emailIdentities.emailIdentities.some((e) => e.publicId === id)
            );

            if (foundPublicId) {
              const emailIdentityMetaEntry =
                emailIdentities.emailIdentities.find(
                  (_) => _.publicId === foundPublicId
                );
              if (emailIdentityMetaEntry) {
                newEmailIdentity = emailIdentityMetaEntry.publicId;
              }
            }
          }
          setEmailIdentity((prev) => {
            if (!newEmailIdentity) {
              newEmailIdentity =
                prev ?? emailIdentities.emailIdentities[0]?.publicId ?? null;
            }
            return newEmailIdentity;
          });
        }
      }, [allMessages, emailIdentities, replyTo, setEmailIdentity]);

      const startReached = useCallback(() => {
        if (isFetchingNextPage || !hasNextPage) return;
        void fetchNextPage();
      }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

      const itemRenderer = useCallback(
        (_: number, message: (typeof allMessages)[number]) => (
          <div
            className="py-4"
            key={message.publicId}>
            <MessageItem
              message={message}
              participantOwnPublicId={participantOwnPublicId}
              formattedParticipants={formattedParticipants}
            />
          </div>
        ),
        [participantOwnPublicId, formattedParticipants]
      );

      const Header = useCallback(() => {
        if (!isFetchingNextPage) return null;
        return (
          <div className="flex w-full items-center justify-center gap-2 text-center font-bold">
            <SpinnerGap
              className="size-4 animate-spin"
              size={16}
            />
            <span>Loading...</span>
          </div>
        );
      }, [isFetchingNextPage]);

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
            startReached={startReached}
            data={allMessages}
            initialTopMostItemIndex={{
              align: 'start',
              index: Math.max(0, allMessages.length - 1)
            }}
            computeItemKey={(_, message) => message.publicId}
            firstItemIndex={firstItemIndex}
            itemContent={itemRenderer}
            style={{ overscrollBehavior: 'none', overflowX: 'clip' }}
            className="w-full"
            ref={ref}
            increaseViewportBy={500}
            components={{
              Header
            }}
          />
        </div>
      );
    }
  )
);

MessagesPanel.displayName = 'MessagesPanel';

const tipTapExtensions = createExtensionSet();

const MessageItem = memo(
  function MessageItem({
    message,
    participantOwnPublicId,
    formattedParticipants
  }: {
    message: RouterOutputs['convos']['entries']['getConvoEntries']['entries'][number];
    participantOwnPublicId: string | null;
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
        ),
      [formattedParticipants, message.author.publicId]
    );
    const [replyTo, setReplyTo] = useAtom(replyToMessageAtom);
    const [viewingOriginalMessage, setViewingOriginalMessage] = useState(false);

    // if the message timestamp is less than a day ago, show the date instead of the time
    const isRecent =
      new Date().getTime() - message.createdAt.getTime() < ms('1 day');

    const viaAddress = message.metadata?.email?.from?.[0]?.email;

    // styling
    const messageStyling = cva('', {
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
          class: 'bg-accent-9 text-accent-1 dark:text-white rounded-tr-sm'
        },
        {
          type: 'message',
          author: false,
          class: 'bg-base-3 rounded-tl-sm'
        },
        {
          type: 'comment',
          author: true,
          class:
            'bg-amber-9 text-amber-1 border-amber-5 border-r-2 rounded-l-md'
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
          'group relative flex w-fit gap-2',
          isUserAuthor ? 'ml-auto' : 'mr-auto'
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
              avatarProfilePublicId={
                messageAuthor?.avatarProfilePublicId ?? 'no_avatar'
              }
              avatarTimestamp={messageAuthor?.avatarTimestamp ?? null}
              name={messageAuthor?.name ?? '...'}
              color={messageAuthor?.color ?? 'accent'}
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
                  {messageAuthor?.name ?? '...'}
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
                  <SmartDateTime date={message.createdAt} />
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
          <div className="absolute -bottom-4 right-4 hidden w-40 grid-cols-4 gap-3 rounded-xl transition delay-150 ease-in-out group-hover:grid">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    'bg-base-3 border-base-1 hover:bg-accent-4 hover:text-accent-11 group relative flex h-8 w-10 items-center justify-center rounded-full border-4',
                    replyTo === message.publicId && 'bg-accent-4 text-accent-11'
                  )}
                  onClick={() => {
                    setReplyTo(message.publicId);
                  }}>
                  <ArrowBendDoubleUpLeft />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {replyTo === message.publicId
                  ? 'Replying to this message'
                  : 'Reply'}
              </TooltipContent>
            </Tooltip>
            {message.rawHtml?.wipeDate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="bg-base-3 border-base-1 hover:bg-accent-4 hover:text-accent-11 group relative flex h-8 w-10 items-center justify-center rounded-full border-4"
                    onClick={() => setViewingOriginalMessage(true)}>
                    <FileDashed />
                  </button>
                </TooltipTrigger>
                <TooltipContent>View Original message</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="bg-base-3 border-base-1 hover:bg-accent-4 hover:text-accent-11 group relative flex h-8 w-10 items-center justify-center rounded-full border-4"
                  onClick={async () => {
                    await copyToClipboard(message.publicId);
                    toast.success('Message ID copied to clipboard');
                  }}>
                  <Hash />
                </button>
              </TooltipTrigger>
              <TooltipContent>Copy message ID</TooltipContent>
            </Tooltip>

            {/* Commented out until we have a way to report bugs */}
            {/* <Tooltip>
          <TooltipTrigger asChild>
            <button className=" group/button relative bg-base-3 h-8 w-10 rounded-full border-4 border-base-1 flex justify-center items-center hover:bg-accent-4 hover:text-accent-11">
              <Bug />
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-base-12 text-base-1 px-2 rounded-md">
            Report a bug
          </TooltipContent>
        </Tooltip> */}
          </div>
        </div>

        {viewingOriginalMessage && message.rawHtml?.wipeDate ? (
          <OriginalMessageView
            setOpen={setViewingOriginalMessage}
            messagePublicId={message.publicId}
          />
        ) : null}
      </div>
    );
  },
  (prev, curr) =>
    prev.message.publicId === curr.message.publicId &&
    prev.participantOwnPublicId === curr.participantOwnPublicId
);

const emptyMessage = `<span class="text-base-11 text-sm">THIS MESSAGE CONTAINS NO VALID TEXT CONTENT</span>`;

// Doing the Fixes Client Side so that we can revert them later if needed
const clientSideHtmlFixes = (html: string) =>
  html
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&#160;', ' ')
    .replaceAll('&shy;', ' ')
    .replaceAll('&#173;', ' ')
    .replaceAll(/\u00AD/g, ' ')
    .trim();

// It is important to memoize the HTMLMessage component to prevent unnecessary re-renders which can cause infinite fetch loops for images
const HTMLMessage = memo(
  function MemoedMessage({ html }: { html: string }) {
    const __html =
      html === '<p></p>' ? emptyMessage : clientSideHtmlFixes(html);

    return (
      <div
        data-html-email-message
        dangerouslySetInnerHTML={{ __html }}
        className="prose-invert prose-a:decoration-blue-9 w-fit min-w-min overflow-ellipsis text-pretty [overflow-wrap:anywhere]"
      />
    );
  },
  (prev, curr) => prev.html === curr.html
);
