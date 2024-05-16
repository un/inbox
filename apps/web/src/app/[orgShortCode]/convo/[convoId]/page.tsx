'use client';

import { type RouterOutputs, api } from '@/src/lib/trpc';
import {
  Avatar,
  Button,
  DropdownMenu,
  Flex,
  IconButton,
  ScrollArea,
  Text,
  Badge,
  Skeleton,
  Spinner,
  Select
} from '@radix-ui/themes';
import Link from 'next/link';
import { type TypeId, validateTypeId } from '@u22n/utils';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type JSONContent, generateHTML } from '@u22n/tiptap/react';
import { tipTapExtensions } from '@u22n/tiptap/extensions';
import {
  formatParticipantData,
  useUpdateConvoMessageList$Cache
} from '../utils';
import { cn, generateAvatarUrl, getInitials } from '@/src/lib/utils';
import ChatSideBar from './_components/chat-sidebar';
import useTimeAgo from '@/src/hooks/use-time-ago';
import { ArrowLeft, Ellipsis } from 'lucide-react';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useCopyToClipboard } from '@uidotdev/usehooks';
import { toast } from 'sonner';
import { ms } from 'itty-time';
import { Virtuoso } from 'react-virtuoso';
import Editor from '../new/editor';
import { emptyTiptapEditorContent } from '@u22n/tiptap';
import AttachmentButton, {
  type ConvoAttachmentUpload
} from '../new/attachment-button';
import { stringify } from 'superjson';
import { type Editor as EditorType } from '@u22n/tiptap/react';

const replyToMessageAtom = atom<null | TypeId<'convoEntries'>>(null);
const selectedEmailIdentityAtom = atom<null | TypeId<'emailIdentities'>>(null);

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

// This is the index of the first item in the list. It is set to a high number to ensure that the list starts at the bottom
// This also means the list can't be longer than 10000 items (which is fine for our most cases)
const INVERSE_LIST_START_INDEX = 10000;

function ConvoView({ convoId }: { convoId: TypeId<'convos'> }) {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const [firstItemIndex, setFirstItemIndex] = useState(
    INVERSE_LIST_START_INDEX
  );
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null);
  const setReplyTo = useSetAtom(replyToMessageAtom);
  const [emailIdentity, setEmailIdentity] = useAtom(selectedEmailIdentityAtom);

  const {
    data: convoData,
    isLoading: convoDataLoading,
    error: convoError
  } = api.convos.getConvo.useQuery({
    orgShortCode,
    convoPublicId: convoId
  });

  const { data: emailIdentities, isLoading: emailIdentitiesLoading } =
    api.org.mail.emailIdentities.getUserEmailIdentities.useQuery({
      orgShortCode
    });

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

  useEffect(() => {
    setEmailIdentity((prev) => {
      if (!emailIdentities) return prev;
      return prev ?? emailIdentities.emailIdentities[0]?.publicId ?? null;
    });
  }, [emailIdentities, setEmailIdentity]);

  const participantOwnPublicId = convoData?.ownParticipantPublicId;
  const convoHidden = useMemo(
    () =>
      convoData
        ? convoData?.data.participants.find(
            (p) => p.publicId === participantOwnPublicId
          )?.hidden ?? false
        : null,
    [convoData, participantOwnPublicId]
  );

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

  const itemRenderer = useCallback(
    (index: number, message: (typeof allMessages)[number]) => (
      <div className="h-full w-full px-8 py-4">
        {index === firstItemIndex && hasNextPage ? (
          <div className="flex w-full items-center justify-center gap-2 p-2">
            <Spinner loading />
            <Text weight="bold">Loading...</Text>
          </div>
        ) : null}
        <MessageItem
          message={message}
          participantOwnPublicId={participantOwnPublicId!}
          allParticipants={allParticipants}
        />
      </div>
    ),
    [participantOwnPublicId, allParticipants, firstItemIndex, hasNextPage]
  );

  if (convoError && convoError.data?.code === 'NOT_FOUND') {
    return <ConvoNotFound />;
  }

  return (
    <Flex className="h-full w-full">
      <Flex
        direction="column"
        className="h-full w-full flex-1">
        <Flex
          className="border-gray-11 h-12 w-full border-b p-2"
          align="center"
          justify="start"
          gap="2">
          <Link href={`/${orgShortCode}/convo`}>
            <IconButton
              variant="soft"
              size="2">
              <ArrowLeft size={16} />
            </IconButton>
          </Link>
          <Skeleton loading={convoDataLoading}>
            <Text
              className="w-full truncate p-1"
              weight="bold">
              {convoData?.data.subjects[0]?.subject ?? '...'}
            </Text>
          </Skeleton>
        </Flex>

        {isLoading || convoDataLoading ? (
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
        )}
        <Flex
          className="border-top min-h-32"
          direction="column"
          justify="end"
          gap="1">
          {!emailIdentitiesLoading ? (
            <div className="flex items-center gap-1">
              <span className="text-gray-9 px-2 text-sm">Reply as</span>
              <Select.Root
                value={emailIdentity ?? undefined}
                onValueChange={(email) =>
                  setEmailIdentity(email as TypeId<'emailIdentities'>)
                }>
                <Select.Trigger className="text-xs" />
                <Select.Content>
                  {emailIdentities?.emailIdentities.map((email) => (
                    <Select.Item
                      key={email.publicId}
                      value={email.publicId}>
                      <span>
                        {email.username}@{email.domainName}
                      </span>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
          ) : null}
          <MessageReplyBox convoId={convoId} />
        </Flex>
      </Flex>
      <ChatSideBar
        participants={allParticipants}
        convoId={convoId}
        convoHidden={convoHidden}
      />
    </Flex>
  );
}

const attachmentsAtom = atom<ConvoAttachmentUpload[]>([]);

function MessageReplyBox({ convoId }: { convoId: TypeId<'convos'> }) {
  const [editorText, setEditorText] = useState<JSONContent>(
    emptyTiptapEditorContent
  );
  const [attachments, setAttachments] = useAtom(attachmentsAtom);
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const replyTo = useAtomValue(replyToMessageAtom);
  const addConvoToCache = useUpdateConvoMessageList$Cache();
  const editorRef = useRef<EditorType | null>(null);
  const emailIdentity = useAtomValue(selectedEmailIdentityAtom);

  // TODO: Find a better way to handle this
  const [loadingType, setLoadingType] = useState<'comment' | 'message'>(
    'message'
  );

  const replyToConvoMutation = api.convos.replyToConvo.useMutation({
    onSuccess: () => {
      editorRef.current?.commands.clearContent();
      setEditorText(emptyTiptapEditorContent);
      setAttachments([]);
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const isEditorEmpty = useMemo(() => {
    const contentArray = editorText?.content;
    if (!contentArray) return true;
    if (contentArray.length === 0) return true;
    if (
      contentArray[0] &&
      (!contentArray[0].content || contentArray[0].content.length === 0)
    )
      return true;
    return false;
  }, [editorText]);

  return (
    <div className="flex max-h-[250px] w-full flex-col gap-1 p-1">
      <Editor
        initialValue={editorText}
        onChange={setEditorText}
        setEditor={(editor) => {
          editorRef.current = editor;
        }}
      />
      <div className="align-center flex justify-end gap-2">
        <AttachmentButton attachmentsAtom={attachmentsAtom} />
        <Button
          variant="soft"
          loading={replyToConvoMutation.isLoading && loadingType === 'comment'}
          disabled={
            !replyTo ||
            isEditorEmpty ||
            !emailIdentity ||
            replyToConvoMutation.isLoading
          }
          onClick={async () => {
            if (!replyTo || !emailIdentity) return;
            setLoadingType('comment');
            const { publicId } = await replyToConvoMutation.mutateAsync({
              attachments,
              orgShortCode,
              message: stringify(editorText),
              replyToMessagePublicId: replyTo,
              messageType: 'comment'
            });
            await addConvoToCache(convoId, publicId);
          }}>
          Comment
        </Button>
        <Button
          loading={replyToConvoMutation.isLoading && loadingType === 'message'}
          disabled={
            !replyTo ||
            isEditorEmpty ||
            !emailIdentity ||
            replyToConvoMutation.isLoading
          }
          onClick={async () => {
            if (!replyTo || !emailIdentity) return;
            setLoadingType('message');
            const { publicId } = await replyToConvoMutation.mutateAsync({
              attachments,
              orgShortCode,
              message: stringify(editorText),
              replyToMessagePublicId: replyTo,
              messageType: 'message',
              sendAsEmailIdentityPublicId: emailIdentity
            });
            await addConvoToCache(convoId, publicId);
          }}>
          Send
        </Button>
      </div>
    </div>
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
        className="w-fit max-w-full overflow-x-hidden">
        <Text className={cn(isUserAuthor ? 'text-right' : 'text-left')}>
          {messageAuthor.name}{' '}
          {message.metadata?.email?.from?.[0]?.email ? (
            <Text color="gray">
              - via {message.metadata.email.from[0].email}
            </Text>
          ) : null}
        </Text>
        <Flex
          className={cn(
            'w-full max-w-full overflow-hidden rounded-lg p-2',
            isUserAuthor
              ? 'dark:bg-blue-10 bg-blue-8'
              : 'dark:bg-gray-10 bg-gray-8'
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
        className="prose dark:prose-invert prose-p:my-1 prose-a:decoration-blue-8 prose-img:my-1 w-full max-w-full overflow-clip break-words text-black dark:text-white"
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
