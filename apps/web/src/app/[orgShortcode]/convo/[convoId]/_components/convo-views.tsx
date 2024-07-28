import { useGlobalStore } from '@/src/providers/global-store-provider';
import { Button } from '@/src/components/shadcn-ui/button';
import { usePageTitle } from '@/src/hooks/use-page-title';
import { type VirtuosoHandle } from 'react-virtuoso';
import { formatParticipantData } from '../../utils';
import { type TypeId } from '@u22n/utils/typeid';
import { MessagesPanel } from './messages-panel';
import { platform } from '@/src/lib/trpc';
import { useMemo, useRef } from 'react';
import { ReplyBox } from './reply-box';
import { env } from '@/src/env';
import TopBar from './top-bar';
import Link from 'next/link';

export function ConvoView({ convoId }: { convoId: TypeId<'convos'> }) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const {
    data: convoData,
    isLoading: convoDataLoading,
    error: convoError
  } = platform.convos.getConvo.useQuery({
    orgShortcode,
    convoPublicId: convoId
  });

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
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl">
      <TopBar
        isConvoLoading={convoDataLoading}
        convoId={convoId}
        convoHidden={convoHidden}
        subjects={convoData?.data.subjects}
        participants={formattedParticipants}
        attachments={attachments}
      />
      <div className="flex w-full min-w-96 flex-1 flex-col">
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
        onReply={() => virtuosoRef.current?.scrollToIndex({ index: 'LAST' })}
      />
    </div>
  );
}

export function ConvoNotFound() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  usePageTitle('Convo Not Found');

  return (
    <div className="mx-auto flex h-full w-full flex-col items-center justify-center gap-3">
      <div className="text-xl font-bold">Convo Not Found</div>
      <div className="text-base-11 text-balance text-sm font-medium">
        The convo you are looking for does not exist or has been deleted.
      </div>
      <Button asChild>
        <Link href={`/${orgShortcode}/convo`}>Go back</Link>
      </Button>
    </div>
  );
}
