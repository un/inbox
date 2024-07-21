'use client';

import { useGlobalStore } from '@/src/providers/global-store-provider';
import AvatarPlus from '@/src/components/avatar-plus';
import { useTimeAgo } from '@/src/hooks/use-time-ago';
import { type RouterOutputs } from '@/src/lib/trpc';
import { Avatar } from '@/src/components/avatar';
import { formatParticipantData } from '../utils';
import { usePathname } from 'next/navigation';
import { cn } from '@/src/lib/utils';
import { useMemo } from 'react';
import Link from 'next/link';

export function ConvoItem({
  convo
}: {
  convo: RouterOutputs['convos']['getOrgMemberConvos']['data'][number];
}) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);

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
  const link = `/${orgShortcode}/convo/${convo.publicId}`;

  const isActive = currentPath === link;

  return (
    <Link
      href={link}
      className={cn(
        'flex h-full flex-row gap-2 overflow-visible rounded-xl border-2 px-2 py-3',
        isActive ? 'border-accent-8' : 'hover:border-base-6 border-transparent'
      )}>
      <AvatarPlus
        size="md"
        users={participantData}
      />
      <div className="flex w-[90%] flex-1 flex-col">
        <div className="flex flex-row items-end justify-between gap-1">
          <span className="truncate text-sm font-medium">
            {participantNames.join(', ')}
          </span>
          <span className="text-base-11 min-w-fit text-right text-xs">
            {timeAgo}
          </span>
        </div>

        <span className="truncate break-all text-left text-xs font-medium">
          {convo.subjects[0]?.subject}
        </span>

        <div className="flex flex-row items-start justify-start gap-1 text-left text-sm">
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

          <span className="line-clamp-2 overflow-ellipsis whitespace-break-spaces break-words">
            {convo.entries[0]?.bodyPlainText ?? ''}
          </span>
        </div>
      </div>
    </Link>
  );
}
