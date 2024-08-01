'use client';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuTrigger,
  ContextMenuItem
} from '@/src/components/shadcn-ui/context-menu';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { formatParticipantData, useDeleteConvo$Cache } from '../utils';
import { Eye, EyeSlash, Trash } from '@phosphor-icons/react/dist/ssr';
import { Checkbox } from '@/src/components/shadcn-ui/checkbox';
import { convoListSelecting, shiftKeyPressed } from '../atoms';
import { platform, type RouterOutputs } from '@/src/lib/trpc';
import AvatarPlus from '@/src/components/avatar-plus';
import { useTimeAgo } from '@/src/hooks/use-time-ago';
import { useLongPress } from '@uidotdev/usehooks';
import { Avatar } from '@/src/components/avatar';
import { type TypeId } from '@u22n/utils/typeid';
import { usePathname } from 'next/navigation';
import { cn } from '@/src/lib/utils';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import Link from 'next/link';

export function ConvoItem({
  convo,
  selected,
  onSelect,
  hidden
}: {
  convo: RouterOutputs['convos']['getOrgMemberConvos']['data'][number];
  selected: boolean;
  onSelect: (shiftKey: boolean) => void;
  hidden: boolean;
}) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const selecting = useAtomValue(convoListSelecting);
  const shiftKey = useAtomValue(shiftKeyPressed);

  const deleteConvoFromCache = useDeleteConvo$Cache();
  const { mutate: deleteConvo } = platform.convos.deleteConvo.useMutation({
    onSuccess: (_, { convoPublicId }) =>
      deleteConvoFromCache(convoPublicId as TypeId<'convos'>)
  });
  const { mutate: hideConvo } = platform.convos.hideConvo.useMutation();

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

  const longPressHandlers = useLongPress(
    (e) => {
      if (selecting) return;
      e.preventDefault();
      e.stopPropagation();
      onSelect(false);
    },
    {
      threshold: 450
    }
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Link
          href={link}
          className={cn(
            'flex h-full flex-row gap-2 overflow-visible rounded-xl border-2 px-2 py-3',
            isActive
              ? 'border-accent-8'
              : 'hover:border-base-6 border-transparent',
            selected && 'bg-accent-3',
            shiftKey && !selecting && 'group'
          )}
          {...longPressHandlers}>
          {selecting ? (
            <Checkbox
              className="size-6 rounded-lg"
              checked={selected}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(e.shiftKey);
              }}
            />
          ) : (
            <div
              className="contents"
              onClick={(e) => {
                if (!e.shiftKey) return;
                e.preventDefault();
                e.stopPropagation();
                onSelect(false);
              }}>
              <div className="bg-accent-2 hidden size-6 rounded-lg border group-hover:block" />
              <div className="group-hover:hidden">
                <AvatarPlus
                  size="md"
                  users={participantData}
                />
              </div>
            </div>
          )}
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
                    avatarProfilePublicId={
                      authorAvatarData.avatarProfilePublicId
                    }
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
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuItem
            className="gap-2"
            onClick={() =>
              hideConvo({
                orgShortcode,
                convoPublicId: convo.publicId,
                unhide: hidden
              })
            }>
            {hidden ? (
              <>
                <Eye /> Show
              </>
            ) : (
              <>
                <EyeSlash /> Hide
              </>
            )}
          </ContextMenuItem>
          <ContextMenuItem
            className="gap-2"
            onClick={async () =>
              deleteConvo({
                orgShortcode,
                convoPublicId: convo.publicId
              })
            }>
            <Trash /> Delete
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}
