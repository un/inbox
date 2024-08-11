'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/src/components/shadcn-ui/select';
import {
  Paperclip,
  Question,
  PaperPlaneTilt,
  ChatTeardropText
} from '@phosphor-icons/react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/src/components/shadcn-ui/tooltip';
import {
  useUpdateConvoData$Cache,
  useUpdateConvoMessageList$Cache
} from '../../utils';
import {
  type JSONContent,
  type EditorFunctions
} from '@u22n/tiptap/components';
import { useAttachmentUploader } from '@/src/components/shared/attachments';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { emailIdentityAtom, replyToMessageAtom } from '../atoms';
import { Button } from '@/src/components/shadcn-ui/button';
import { useOrgShortcode } from '@/src/hooks/use-params';
import { useIsMobile } from '@/src/hooks/use-is-mobile';
import { emptyTiptapEditorContent } from '@u22n/tiptap';
import { useDraft } from '@/src/stores/draft-store';
import { Editor } from '@/src/components/editor';
import { type TypeId } from '@u22n/utils/typeid';
import { useDebounce } from '@uidotdev/usehooks';
import { useAtom, useAtomValue } from 'jotai';
import { platform } from '@/src/lib/trpc';
import { stringify } from 'superjson';
import { cn } from '@/src/lib/utils';
import { ms } from '@u22n/utils/ms';
import { toast } from 'sonner';

type ReplyBoxProps = {
  convoId: TypeId<'convos'>;
  onReply: () => void;
  hasExternalParticipants: boolean;
};

export function ReplyBox({
  convoId,
  onReply,
  hasExternalParticipants
}: ReplyBoxProps) {
  const { draft, setDraft, resetDraft } = useDraft(convoId);
  const [editorText, setEditorText] = useState(draft.content);
  const orgShortcode = useOrgShortcode();
  const replyTo = useAtomValue(replyToMessageAtom);
  const addConvoToCache = useUpdateConvoMessageList$Cache();
  const updateConvoData = useUpdateConvoData$Cache();
  const editorRef = useRef<EditorFunctions>(null);
  const isMobile = useIsMobile();

  const [loadingType, setLoadingType] = useState<'comment' | 'message'>(
    'message'
  );

  const { mutateAsync: replyToConvo, isPending: replyToConvoLoading } =
    platform.convos.replyToConvo.useMutation({
      onSuccess: () => {
        resetDraft();
        editorRef.current?.clearContent();
        setEditorText(emptyTiptapEditorContent);
        removeAllAttachments();
      }
    });

  const emptyEditorChecker = useCallback((editorText: JSONContent) => {
    const contentArray = editorText?.content;
    if (!contentArray) return true;
    if (contentArray.length === 0) return true;
    if (
      contentArray[0] &&
      (!contentArray[0].content || contentArray[0].content.length === 0)
    )
      return true;
    return false;
  }, []);

  const isEditorEmpty = useMemo(
    () => emptyEditorChecker(editorText),
    [emptyEditorChecker, editorText]
  );

  const { data: emailIdentities, isLoading: emailIdentitiesLoading } =
    platform.org.mail.emailIdentities.getUserEmailIdentities.useQuery(
      {
        orgShortcode
      },
      {
        staleTime: ms('1 hour')
      }
    );
  const { data: isAdmin } =
    platform.org.users.members.isOrgMemberAdmin.useQuery(
      {
        orgShortcode
      },
      {
        staleTime: ms('1 hour')
      }
    );

  const [emailIdentity, setEmailIdentity] = useAtom(emailIdentityAtom);

  const {
    attachments,
    openFilePicker,
    getTrpcUploadFormat,
    AttachmentArray,
    removeAllAttachments
  } = useAttachmentUploader(draft.attachments);

  // Autosave draft
  const debouncedEditorText = useDebounce(editorText, 500);
  useEffect(() => {
    if (emptyEditorChecker(debouncedEditorText) && attachments.length === 0) {
      resetDraft();
    } else {
      setDraft({
        content: debouncedEditorText,
        attachments
      });
    }
  }, [
    debouncedEditorText,
    setDraft,
    attachments,
    emptyEditorChecker,
    resetDraft
  ]);

  const handleReply = useCallback(
    async (type: 'comment' | 'message') => {
      if (!replyTo) return;
      if (hasExternalParticipants && emailIdentity === null) {
        toast.error('Please select an email identity to send the message as.');
        return;
      }
      setLoadingType(type);
      const { publicId, bodyPlainText } = await replyToConvo({
        attachments: getTrpcUploadFormat(),
        orgShortcode,
        message: stringify(editorText),
        replyToMessagePublicId: replyTo,
        messageType: type,
        sendAsEmailIdentityPublicId: emailIdentity ?? undefined
      });
      await addConvoToCache(convoId, publicId);
      await updateConvoData(convoId, (oldData) => {
        const author = oldData.participants.find(
          (participant) =>
            participant.publicId === oldData.entries[0]?.author.publicId
        );
        if (!author) return oldData;
        const newEntry: (typeof oldData.entries)[0] = {
          author: structuredClone(author),
          bodyPlainText,
          type
        };
        oldData.lastUpdatedAt = new Date();
        oldData.entries.unshift(newEntry);
        return oldData;
      });

      onReply();
    },
    [
      addConvoToCache,
      convoId,
      editorText,
      emailIdentity,
      getTrpcUploadFormat,
      hasExternalParticipants,
      onReply,
      orgShortcode,
      replyTo,
      replyToConvo,
      updateConvoData
    ]
  );

  return (
    <div className="flex min-h-32 flex-col p-4">
      <div
        className={cn(
          'border-base-5 group relative mt-3 flex max-h-[250px] w-full flex-col gap-1 rounded-md border px-2 py-1',
          !isEditorEmpty && 'hover:rounded-tr-none'
        )}>
        {!isEditorEmpty && (
          <Button
            variant="link"
            size="xs"
            className="text-base-11 border-base-5 bg-base-1 absolute -top-5 right-[-1px] h-5 translate-y-4 cursor-pointer rounded-b-none border border-b-0 py-0 text-xs opacity-0 transition-all delay-100 group-hover:translate-y-0 group-hover:opacity-100"
            onClick={() => {
              resetDraft();
              editorRef.current?.clearContent();
              removeAllAttachments();
              setEditorText(emptyTiptapEditorContent);
            }}>
            Clear Draft
          </Button>
        )}
        <Editor
          initialValue={editorText}
          onChange={setEditorText}
          ref={editorRef}
        />
        <AttachmentArray attachments={attachments} />
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {!emailIdentitiesLoading && hasExternalParticipants ? (
              <div className="flex min-w-5 items-center justify-start gap-1">
                <span className="text-gray-9 px-2 text-sm">From:</span>
                <Select
                  value={emailIdentity ?? undefined}
                  onValueChange={(email) => {
                    if (
                      emailIdentities?.emailIdentities.find(
                        (e) => e.publicId === email
                      )?.sendingEnabled === false
                    ) {
                      return;
                    }
                    setEmailIdentity(email as TypeId<'emailIdentities'>);
                  }}>
                  <SelectTrigger
                    size="sm"
                    className="min-w-5">
                    <SelectValue placeholder="Select an email address" />
                  </SelectTrigger>
                  <SelectContent>
                    {emailIdentities?.emailIdentities.map((email) => (
                      <SelectItem
                        key={email.publicId}
                        value={email.publicId}
                        className="[&>span:last-child]:w-full">
                        <span
                          className={cn(
                            'flex !min-w-0 items-center justify-between',
                            !email.sendingEnabled && 'text-base-11'
                          )}>
                          <span className="truncate">
                            {`${email.sendName} (${email.username}@${email.domainName})`}
                          </span>
                          {!email.sendingEnabled && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Question size={14} />
                              </TooltipTrigger>
                              <TooltipContent className="flex flex-col">
                                <span>
                                  Sending from this email identity is disabled.
                                </span>
                                <span>
                                  {isAdmin
                                    ? 'Please check that the DNS records are correctly set up.'
                                    : 'Please contact your admin for assistance.'}
                                </span>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <Button
              variant={'outline'}
              size={'icon-sm'}
              onClick={() => {
                openFilePicker();
              }}>
              <Paperclip size={16} />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size={isMobile ? 'icon' : 'sm'}
              loading={replyToConvoLoading && loadingType === 'comment'}
              disabled={
                !replyTo ||
                isEditorEmpty ||
                !emailIdentity ||
                replyToConvoLoading
              }
              onPointerDown={(e) => {
                e.preventDefault();
                return handleReply('comment');
              }}>
              {isMobile ? <ChatTeardropText size={16} /> : <span>Comment</span>}
            </Button>
            <Button
              loading={replyToConvoLoading && loadingType === 'message'}
              disabled={
                !replyTo ||
                isEditorEmpty ||
                (hasExternalParticipants && !emailIdentity) ||
                replyToConvoLoading
              }
              size={isMobile ? 'icon' : 'sm'}
              onPointerDown={(e) => {
                e.preventDefault();
                return handleReply('message');
              }}>
              {isMobile ? <PaperPlaneTilt size={16} /> : <span>Send</span>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
