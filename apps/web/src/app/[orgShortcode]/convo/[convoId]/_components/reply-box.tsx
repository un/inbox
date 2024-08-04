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
import { useAttachmentUploader } from '@/src/components/shared/attachments';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { type EditorFunctions } from '@u22n/tiptap/components';
import { Button } from '@/src/components/shadcn-ui/button';
import { useIsMobile } from '@/src/hooks/use-is-mobile';
import { emptyTiptapEditorContent } from '@u22n/tiptap';
import { type JSONContent } from '@u22n/tiptap/react';
import { atom, useAtom, useAtomValue } from 'jotai';
import { Editor } from '@/src/components/editor';
import { type TypeId } from '@u22n/utils/typeid';
import { replyToMessageAtom } from '../atoms';
import { platform } from '@/src/lib/trpc';
import { stringify } from 'superjson';
import { cn } from '@/src/lib/utils';
import { ms } from '@u22n/utils/ms';
import { toast } from 'sonner';

const selectedEmailIdentityAtom = atom<null | TypeId<'emailIdentities'>>(null);

type ReplyBoxProps = {
  convoId: TypeId<'convos'>;
  onReply: () => void;
};

export function ReplyBox({ convoId, onReply }: ReplyBoxProps) {
  const [editorText, setEditorText] = useState<JSONContent>(
    emptyTiptapEditorContent
  );
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
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
        editorRef.current?.clearContent();
        setEditorText(emptyTiptapEditorContent);
        removeAllAttachments();
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

  const [emailIdentity, setEmailIdentity] = useAtom(selectedEmailIdentityAtom);

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

  useEffect(() => {
    setEmailIdentity((prev) => {
      if (prev) return prev;
      return (
        emailIdentities?.defaultEmailIdentity ??
        emailIdentities?.emailIdentities[0]?.publicId ??
        null
      );
    });
  }, [emailIdentities, setEmailIdentity]);

  const {
    attachments,
    openFilePicker,
    getTrpcUploadFormat,
    AttachmentArray,
    removeAllAttachments
  } = useAttachmentUploader();

  const handleReply = useCallback(
    async (type: 'comment' | 'message') => {
      if (!replyTo || !emailIdentity) return;
      setLoadingType(type);
      const { publicId, bodyPlainText } = await replyToConvo({
        attachments: getTrpcUploadFormat(),
        orgShortcode,
        message: stringify(editorText),
        replyToMessagePublicId: replyTo,
        messageType: type
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
      onReply,
      orgShortcode,
      replyTo,
      replyToConvo,
      updateConvoData
    ]
  );

  return (
    <div className="flex min-h-32 flex-col p-4">
      <div className="border-base-5 flex max-h-[250px] w-full flex-col gap-1 rounded-md border p-1">
        <Editor
          initialValue={editorText}
          onChange={setEditorText}
          ref={editorRef}
        />
        <AttachmentArray attachments={attachments} />
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {!emailIdentitiesLoading ? (
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
                !emailIdentity ||
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
