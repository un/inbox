'use client';

import { useGlobalStore } from '@/src/providers/global-store-provider';
import { usePageTitle } from '@/src/hooks/use-page-title';
import { type VirtuosoHandle } from 'react-virtuoso';
import { useCallback, useMemo, useRef } from 'react';
import { formatParticipantData } from '../../utils';
import { type TypeId } from '@u22n/utils/typeid';
import { MessagesPanel } from './messages-panel';
import { platform } from '@/src/lib/trpc';
import { ReplyBox } from './reply-box';
import { ms } from '@u22n/utils/ms';
import { env } from '@/src/env';
import TopBar from './top-bar';

export function ConvoView({ convoId }: { convoId: TypeId<'convos'> }) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const {
    data: convoData,
    isLoading: convoDataLoading,
    error: convoError
  } = platform.convos.getConvo.useQuery(
    {
      orgShortcode,
      convoPublicId: convoId
    },
    {
      staleTime: ms('1 minute')
    }
  );

  usePageTitle(convoData?.data.subjects[0]?.subject ?? 'UnInbox');

  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const attachments = useMemo(() => {
    if (!convoData) return [];
    return convoData.data.attachments
      .filter((f) => !f.inline)
      .map((attachment) => ({
        name: attachment.fileName,
        url: `${env.NEXT_PUBLIC_STORAGE_URL}/attachment/${orgShortcode}/${attachment.publicId}/${attachment.fileName}`,
        type: attachment.type,
        publicId: attachment.publicId
      }));
  }, [convoData, orgShortcode]);

  const participantOwnPublicId = convoData?.ownParticipantPublicId;
  const convoHidden = useMemo(
    () =>
      convoData
        ? (convoData?.data.participants.find(
            (p) => p.publicId === participantOwnPublicId
          )?.hidden ?? false)
        : null,
    [convoData, participantOwnPublicId]
  );

  const formattedParticipants = useMemo(() => {
    const formattedParticipantsData: NonNullable<
      ReturnType<typeof formatParticipantData>
    >[] = [];
    if (convoData?.data.participants) {
      for (const participant of convoData.data.participants) {
        const formattedParticipant = formatParticipantData(participant);
        if (!formattedParticipant) continue;
        formattedParticipantsData.push(formattedParticipant);
      }
    }
    return formattedParticipantsData;
  }, [convoData?.data.participants]);

  const hasExternalParticipants = useMemo(
    () => formattedParticipants.some((p) => p.type === 'contact'),
    [formattedParticipants]
  );

  const defaultEmailIdentity = useMemo(
    () =>
      convoData?.data.participants.find(
        (p) => p.publicId === participantOwnPublicId
      )?.emailIdentity?.publicId,
    [convoData?.data.participants, participantOwnPublicId]
  );

  const onReply = useCallback(
    () => virtuosoRef.current?.scrollToIndex({ index: 'LAST' }),
    []
  );

  if (convoError && convoError.data?.code === 'NOT_FOUND') {
    return <ConvoNotFound />;
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col rounded-2xl">
      <TopBar
        isConvoLoading={convoDataLoading}
        convoId={convoId}
        convoHidden={convoHidden}
        subjects={convoData?.data.subjects}
        participants={formattedParticipants}
        attachments={attachments}
      />
      <div className="flex w-full flex-1 flex-col">
        {convoDataLoading || !participantOwnPublicId ? (
          <span>Loading</span>
        ) : (
          <MessagesPanel
            convoId={convoId}
            formattedParticipants={formattedParticipants}
            participantOwnPublicId={
              participantOwnPublicId as TypeId<'convoParticipants'>
            }
            ref={virtuosoRef}
          />
        )}
      </div>
      <ReplyBox
        convoId={convoId}
        onReply={onReply}
        hasExternalParticipants={hasExternalParticipants}
        defaultEmailIdentity={defaultEmailIdentity}
      />
    </div>
  );
}

export function ConvoNotFound() {
  usePageTitle('Convo Not Found');

  return (
    <div className="mx-auto flex h-full w-full flex-col items-center justify-center gap-3">
      <div className="text-xl font-bold">Convo Not Found</div>
      <div className="text-base-11 text-balance text-center text-sm font-medium">
        The convo you are looking for does not exist or has been deleted.
      </div>
    </div>
  );
}
