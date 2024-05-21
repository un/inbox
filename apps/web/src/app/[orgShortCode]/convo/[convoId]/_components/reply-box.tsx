'use client';

import { api } from '@/src/lib/trpc';
import { Select } from '@radix-ui/themes';
import { type TypeId } from '@u22n/utils/typeid';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type JSONContent } from '@u22n/tiptap/react';
import { useUpdateConvoMessageList$Cache } from '../../utils';
import { atom, useAtom, useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { Editor } from '@/src/components/shared/editor';
import { emptyTiptapEditorContent } from '@u22n/tiptap';
import {
  AttachmentButton,
  type ConvoAttachmentUpload
} from '@/src/components/shared/attachment-button';
import { stringify } from 'superjson';
import { type Editor as EditorType } from '@u22n/tiptap/react';
import { replyToMessageAtom } from '../atoms';
import { Button } from '@/src/components/shadcn-ui/button';

const selectedEmailIdentityAtom = atom<null | TypeId<'emailIdentities'>>(null);
const attachmentsAtom = atom<ConvoAttachmentUpload[]>([]);

export function ReplyBox({ convoId }: { convoId: TypeId<'convos'> }) {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  // const setReplyTo = useSetAtom(replyToMessageAtom);
  const [emailIdentity, setEmailIdentity] = useAtom(selectedEmailIdentityAtom);

  const { data: emailIdentities, isLoading: emailIdentitiesLoading } =
    api.org.mail.emailIdentities.getUserEmailIdentities.useQuery({
      orgShortCode
    });

  useEffect(() => {
    setEmailIdentity((prev) => {
      if (!emailIdentities) return prev;
      return prev ?? emailIdentities.emailIdentities[0]?.publicId ?? null;
    });
  }, [emailIdentities, setEmailIdentity]);

  return (
    <div className="bg-yellow-5 flex min-h-32 flex-col justify-end">
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
    </div>
  );
}

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
  const [, setLoadingType] = useState<'comment' | 'message'>('message');

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
          variant="secondary"
          // loading={replyToConvoMutation.isLoading && loadingType === 'comment'}
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
          // loading={replyToConvoMutation.isLoading && loadingType === 'message'}
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
