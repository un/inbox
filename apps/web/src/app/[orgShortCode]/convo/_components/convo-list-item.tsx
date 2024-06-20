'use client';

import { type RouterOutputs } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useMemo } from 'react';
import useTimeAgo from '@/src/hooks/use-time-ago';
import { formatParticipantData } from '../utils';
import Link from 'next/link';
import AvatarPlus from '@/src/components/avatar-plus';
import { Avatar } from '@/src/components/avatar';
import { cn } from '@/src/lib/utils';
import { usePathname } from 'next/navigation';

export function ConvoItem({
  convo
}: {
  convo: RouterOutputs['convos']['getOrgMemberConvos']['data'][number];
}) {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);

  const timeAgo = useTimeAgo(convo.lastUpdatedAt);

  const authorAsParticipant = useMemo(() => {
    return (
      convo.participants.find(
        (participant) =>
          participant.publicId === convo.entries[0]?.author.publicId
      ) ?? convo.participants[0]
    );
  }, [convo.participants, convo.entries]);

  const authorAvatarData = useMemo(() => {
    return formatParticipantData(authorAsParticipant!);
  }, [authorAsParticipant]);

  const participantData = useMemo(() => {
    const allParticipants = convo.participants
      .map((participant) => formatParticipantData(participant))
      .filter(Boolean) as NonNullable<
      ReturnType<typeof formatParticipantData>
    >[];
    const participantsWithoutAuthor = allParticipants.filter(
      (participant) =>
        participant.participantPublicId !== authorAsParticipant?.publicId
    );
    const author = allParticipants.find(
      (participant) =>
        participant.participantPublicId === authorAsParticipant?.publicId
    )!;
    return [author].concat(participantsWithoutAuthor);
  }, [convo.participants, authorAsParticipant]);

  const participantNames = useMemo(() => {
    return participantData.map((participant) => participant.name);
  }, [participantData]);

  const currentPath = usePathname();
  const link = `/${orgShortCode}/convo/${convo.publicId}`;

  const isActive = currentPath === link;

  return (
    <Link
      href={link}
      className={cn(
        'flex h-full w-full max-w-full flex-row gap-2 overflow-visible rounded-lg border-2 px-2 py-3',
        isActive ? 'border-accent-8' : 'hover:border-base-6 border-transparent'
      )}>
      <AvatarPlus
        size="md"
        users={participantData}
      />
      <div className="flex w-full flex-1 flex-col">
        <div className="flex w-full flex-row items-end justify-between gap-1">
          <span className="truncate text-sm font-medium">
            {participantNames.join(', ')}
          </span>
          <span className="text-base-11 min-w-fit text-right text-xs">
            {timeAgo}
          </span>
        </div>

        <span className="w-full truncate text-left text-xs font-medium">
          {convo.subjects[0]?.subject}
        </span>

        <div className="flex w-full flex-row items-start justify-start gap-1 text-left text-sm">
          <div className="px-0.5">
            {authorAvatarData && (
              <Avatar
                avatarProfilePublicId={authorAvatarData.avatarProfilePublicId}
                avatarTimestamp={authorAvatarData.avatarTimestamp}
                name={authorAvatarData.name}
                size={'sm'}
                color={authorAvatarData.color}
                key={authorAvatarData.participantPublicId}
              />
            )}
          </div>

          <span className="line-clamp-2 w-full max-w-full overflow-ellipsis break-words">
            {convo.entries[0]?.bodyPlainText ?? ''}
          </span>
        </div>
      </div>
    </Link>
  );
}
