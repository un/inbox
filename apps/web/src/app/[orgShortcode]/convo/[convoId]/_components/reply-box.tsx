'use client';

import { platform } from '@/src/lib/trpc';
import { type TypeId } from '@u22n/utils/typeid';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type JSONContent } from '@u22n/tiptap/react';
import { useUpdateConvoMessageList$Cache } from '../../utils';
import { atom, useAtom, useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { Editor } from '@/src/components/shared/editor';
import { emptyTiptapEditorContent } from '@u22n/tiptap';
import { useAttachmentUploader } from '@/src/components/shared/attachments';
import { stringify } from 'superjson';
import { type Editor as EditorType } from '@u22n/tiptap/react';
import { replyToMessageAtom } from '../atoms';
import { Button } from '@/src/components/shadcn-ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/src/components/shadcn-ui/select';
import { Paperclip, Question } from '@phosphor-icons/react';
import { cn } from '@/src/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/src/components/shadcn-ui/tooltip';

const selectedEmailIdentityAtom = atom<null | TypeId<'emailIdentities'>>(null);

export function ReplyBox({ convoId }: { convoId: TypeId<'convos'> }) {
  const [editorText, setEditorText] = useState<JSONContent>(
    emptyTiptapEditorContent
  );
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const replyTo = useAtomValue(replyToMessageAtom);
  const addConvoToCache = useUpdateConvoMessageList$Cache();
  const editorRef = useRef<EditorType | null>(null);

  // TODO: Find a better way to handle this
  const [, setLoadingType] = useState<'comment' | 'message'>('message');

  const replyToConvoMutation = platform.convos.replyToConvo.useMutation({
    onSuccess: () => {
      editorRef.current?.commands.clearContent();
      setEditorText(emptyTiptapEditorContent);
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
    platform.org.mail.emailIdentities.getUserEmailIdentities.useQuery({
      orgShortcode
    });
  const { data: isAdmin } =
    platform.org.users.members.isOrgMemberAdmin.useQuery({
      orgShortcode
    });

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

  const { attachments, openFilePicker, getTrpcUploadFormat, AttachmentArray } =
    useAttachmentUploader();

  return (
    <div className="flex min-h-32 flex-col justify-end p-4">
      <div className="border-base-5 flex max-h-[250px] w-full flex-col gap-1 rounded-md border p-1">
        <Editor
          initialValue={editorText}
          onChange={setEditorText}
          setEditor={(editor) => {
            editorRef.current = editor;
          }}
        />
        <AttachmentArray attachments={attachments} />
        <div className="flex flex-row items-center justify-between gap-2">
          <div className="flex flex-row items-center gap-2">
            {!emailIdentitiesLoading ? (
              <div className="flex flex-row items-center justify-start gap-1">
                <span className="text-gray-9 px-2 text-sm">From:</span>
                <div className="max-w-80">
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
                      size={'sm'}
                      width={'fit'}
                      className="text-xs">
                      <SelectValue placeholder="Select an email address" />
                    </SelectTrigger>
                    <SelectContent>
                      {emailIdentities?.emailIdentities.map((email) => (
                        <SelectItem
                          key={email.publicId}
                          value={email.publicId}
                          className="[&>span:last-child]:w-full">
                          <span className="flex items-center justify-between">
                            <span
                              className={cn(
                                !email.sendingEnabled && 'text-base-11'
                              )}>
                              {`${email.sendName} (${email.username}@${email.domainName})`}
                            </span>
                            {!email.sendingEnabled && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Question size={14} />
                                </TooltipTrigger>
                                <TooltipContent className="flex flex-col">
                                  <span>
                                    Sending from this email identity is
                                    disabled.
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
          <div className="align-center flex justify-end gap-2">
            <Button
              variant="secondary"
              size={'sm'}
              disabled={
                !replyTo ||
                isEditorEmpty ||
                !emailIdentity ||
                replyToConvoMutation.isPending
              }
              onClick={async () => {
                if (!replyTo || !emailIdentity) return;
                setLoadingType('comment');
                const { publicId } = await replyToConvoMutation.mutateAsync({
                  attachments: getTrpcUploadFormat(),
                  orgShortcode,
                  message: stringify(editorText),
                  replyToMessagePublicId: replyTo,
                  messageType: 'comment'
                });
                await addConvoToCache(convoId, publicId);
              }}>
              Comment
            </Button>
            <Button
              // loading={replyToConvoMutation.isLoading && loadingType === 'message'}
              disabled={
                !replyTo ||
                isEditorEmpty ||
                !emailIdentity ||
                replyToConvoMutation.isPending
              }
              size={'sm'}
              onClick={async () => {
                if (!replyTo || !emailIdentity) return;
                setLoadingType('message');
                const { publicId } = await replyToConvoMutation.mutateAsync({
                  attachments: getTrpcUploadFormat(),
                  orgShortcode,
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
      </div>
    </div>
  );
}
