'use client';

import { api } from '@/src/lib/trpc';
import Link from 'next/link';
import { type TypeId, validateTypeId } from '@u22n/utils/typeid';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useMemo } from 'react';
import { formatParticipantData } from '../utils';
import { ContextPanel } from './_components/context-panel';
import { env } from 'next-runtime-env';
import { MessagesPanel } from './_components/messages-panel';
import TopBar from './_components/top-bar';
import { ReplyBox } from './_components/reply-box';
import { Button } from '@/src/components/shadcn-ui/button';

const STORAGE_URL = env('NEXT_PUBLIC_STORAGE_URL');

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

function ConvoView({ convoId }: { convoId: TypeId<'convos'> }) {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const {
    data: convoData,
    isLoading: convoDataLoading,
    error: convoError
  } = api.convos.getConvo.useQuery({
    orgShortCode,
    convoPublicId: convoId
  });

  const attachments = useMemo(() => {
    if (!convoData) return [];
    return convoData.data.attachments
      .filter((f) => !f.inline)
      .map((attachment) => ({
        name: attachment.fileName,
        url: `${STORAGE_URL}/attachment/${orgShortCode}/${attachment.publicId}/${attachment.fileName}`,
        type: attachment.type,
        publicId: attachment.publicId
      }));
  }, [convoData, orgShortCode]);

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

  if (convoError && convoError.data?.code === 'NOT_FOUND') {
    return <ConvoNotFound />;
  }

  return (
    <div className="flex h-full max-h-full w-full max-w-full flex-col overflow-hidden">
      <TopBar
        isConvoLoading={convoDataLoading}
        convoId={convoId}
        convoHidden={convoHidden}
        subjects={convoData?.data.subjects}
      />
      <div className="flex h-full w-full flex-row">
        <div className="flex h-full w-full flex-row">
          <div className="bg-green-5 flex h-full w-full min-w-96 flex-col">
            {convoDataLoading || !participantOwnPublicId ? (
              <span>Loading</span>
            ) : (
              <MessagesPanel
                convoId={convoId}
                formattedParticipants={formattedParticipants}
                participantOwnPublicId={
                  participantOwnPublicId as TypeId<'convoParticipants'>
                }
              />
            )}
            <ReplyBox convoId={convoId} />
          </div>
          <ContextPanel
            participants={formattedParticipants}
            attachments={attachments}
          />
        </div>
      </div>
    </div>
  );
}

function ConvoNotFound() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  return (
    <div className=" flex h-full w-full flex-col items-center justify-center">
      <div>
        <span>Convo Not Found</span>
        <span>
          The convo you are looking for does not exist. Please check the URL and
          try again.
        </span>
        <Link href={`/${orgShortCode}/convo`}>
          <Button>Go back to Convos</Button>
        </Link>
      </div>
    </div>
  );
}
