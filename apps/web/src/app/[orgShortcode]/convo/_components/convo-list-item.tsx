'use client';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuTrigger,
  ContextMenuItem
} from '@/src/components/shadcn-ui/context-menu';
import {
  type Convo,
  formatParticipantData,
  useDeleteConvo$Cache
} from '../utils';
import { useOrgShortcode, useSpaceShortcode } from '@/src/hooks/use-params';
import { LongPressEventType, useLongPress } from 'use-long-press';
import { Checkbox } from '@/src/components/shadcn-ui/checkbox';
import { AvatarPlus } from '@/src/components/avatar-plus';
import { usePathname, useRouter } from 'next/navigation';
import { useIsMobile } from '@/src/hooks/use-is-mobile';
import { Trash } from '@phosphor-icons/react/dist/ssr';
import { useTimeAgo } from '@/src/hooks/use-time-ago';
import { type TypeId } from '@u22n/utils/typeid';
import { convoListSelecting } from '../atoms';
import { platform } from '@/src/lib/trpc';
import { memo, useMemo } from 'react';
import { cn } from '@/src/lib/utils';
import { useAtomValue } from 'jotai';

export const ConvoItem = memo(function ConvoItem({
  convo,
  selected,
  onSelect,
  // hidden,
  linkBase
}: {
  convo: Convo;
  selected: boolean;
  // hidden: boolean;
  linkBase: string;
  onSelect: (shiftKey: boolean) => void;
}) {
  const orgShortcode = useOrgShortcode();
  const spaceShortcode = useSpaceShortcode();
  const selecting = useAtomValue(convoListSelecting);
  const isMobile = useIsMobile();
  const router = useRouter();

  const deleteConvoFromCache = useDeleteConvo$Cache();
  const { mutate: deleteConvo } = platform.convos.deleteConvo.useMutation({
    onSuccess: (_, { convoPublicId }) =>
      deleteConvoFromCache({
        convoPublicId: convoPublicId as TypeId<'convos'>,
        spaceShortcode: spaceShortcode ?? 'personal'
      })
  });
  // const { mutate: hideConvo } = platform.convos.hideConvo.useMutation();

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
    );
    if (!author) return participantsWithoutAuthor;
    return [author].concat(participantsWithoutAuthor);
  }, [convo.participants, authorAsParticipant]);

  const participantNames = useMemo(() => {
    return participantData.map((participant) => participant.name);
  }, [participantData]);

  const currentPath = usePathname();
  const isActive = currentPath === `${linkBase}/${convo.publicId}`;

  const longPressHandlers = useLongPress(
    () => {
      if (!selecting) onSelect(false);
    },
    {
      threshold: 750,
      detect: LongPressEventType.Touch,
      cancelOnMovement: 15
    }
  );
  const isUnread = true;

  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        onContextMenu={
          isMobile
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
              }
            : undefined
        }>
        <div
          onClick={() => router.push(`${linkBase}/${convo.publicId}`)}
          className={cn(
            'flex h-full cursor-pointer flex-row gap-2 overflow-visible rounded-xl border px-2 py-3',
            isActive
              ? 'border-accent-8'
              : 'hover:border-base-6 border-transparent',
            selected && 'bg-accent-3',
            !selecting && 'group'
          )}
          {...longPressHandlers()}>
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
              <div className="bg-accent-2 shift-key:group-hover:block hidden size-6 rounded-lg border" />
              <div className="shift-key:group-hover:hidden">
                <AvatarPlus
                  size="md"
                  users={participantData}
                />
              </div>
            </div>
          )}
          <div className="flex w-[90%] flex-1 flex-col">
            <div className="flex flex-row items-end justify-between gap-1">
              <span className="truncate break-all text-left font-medium">
                {convo.subjects[0]?.subject}
              </span>
              <span className="text-base-11 min-w-fit text-right text-xs">
                {timeAgo}
              </span>
            </div>
            <span className="truncate text-xs font-medium">
              {participantNames.join(', ')}
            </span>

            <div className="flex flex-row items-start justify-start gap-1 text-left text-sm">
              <span className="ph-no-capture line-clamp-2 overflow-clip break-words">
                <span className="font-semibold">
                  {authorAvatarData?.name.trim() + ': ' ?? ''}
                </span>
                {convo.entries[0]?.bodyPlainText.trim() ?? ''}
              </span>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          {/* <ContextMenuItem
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
          </ContextMenuItem> */}
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
});
