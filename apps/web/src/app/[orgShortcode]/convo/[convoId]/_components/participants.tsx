import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/src/components/shadcn-ui/drawer';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/src/components/shadcn-ui/hover-card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/src/components/shadcn-ui/tooltip';
import { Separator } from '@/src/components/shadcn-ui/separator';
import { Avatar, AvatarIcon } from '@/src/components/avatar';
import { Button } from '@/src/components/shadcn-ui/button';
import { type formatParticipantData } from '../../utils';
import { Dot, PenNib, X } from '@phosphor-icons/react';
import { memo, useMemo } from 'react';

export const Participants = memo(function Participants({
  participants
}: {
  participants: NonNullable<ReturnType<typeof formatParticipantData>>[];
}) {
  const orderedParticipants = useMemo(() => {
    const orderedParticipants: NonNullable<
      ReturnType<typeof formatParticipantData>
    >[] = [];
    orderedParticipants.push(
      ...participants.filter((p) => p.role === 'assigned')
    );
    orderedParticipants.push(
      ...participants.filter((p) => p.role === 'contributor')
    );
    orderedParticipants.push(
      ...participants.filter((p) => p.role === 'commenter')
    );
    orderedParticipants.push(...participants.filter((p) => p.role === 'guest'));
    orderedParticipants.push(
      ...participants.filter((p) => p.role === 'watcher')
    );
    return orderedParticipants;
  }, [participants]);

  const assignedParticipantIds = useMemo(
    () =>
      orderedParticipants
        .filter((p) => p.role === 'assigned')
        .map((p) => p.participantPublicId),
    [orderedParticipants]
  );

  return (
    <Drawer
      direction="right"
      noBodyStyles
      shouldScaleBackground={false}>
      <DrawerTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={
                'hover:text-base-12 text-base-11 flex h-6 min-h-6 w-fit cursor-pointer flex-row items-center gap-0.5 p-0'
              }>
              {orderedParticipants.map((participant) => (
                <div
                  className="flex flex-col gap-1"
                  key={participant.participantPublicId}>
                  <div
                    className={
                      assignedParticipantIds.includes(
                        participant.participantPublicId
                      )
                        ? 'ring-accent-9 border-base-1 rounded-md border ring-1'
                        : ''
                    }>
                    <Avatar
                      avatarProfilePublicId={participant.avatarProfilePublicId}
                      avatarTimestamp={participant.avatarTimestamp}
                      name={participant.name}
                      color={participant.color}
                      size="md"
                      hideTooltip
                    />
                  </div>
                </div>
              ))}
            </div>
          </TooltipTrigger>
          <TooltipContent>View Conversation Participants</TooltipContent>
        </Tooltip>
      </DrawerTrigger>

      <DrawerContent className="max-w-[80%] focus-within:outline-none">
        <div className="h-full w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>
              <span>Participants</span>
              <DrawerClose asChild>
                <Button
                  variant={'outline'}
                  size={'icon-sm'}>
                  <X size={16} />
                </Button>
              </DrawerClose>
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              Participants are the people who are part of this conversation
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-4 pt-4">
            {orderedParticipants.map((participant) => (
              <div
                className="flex flex-row items-center justify-between gap-2"
                key={participant.participantPublicId}>
                <div className="flex flex-row items-center gap-2">
                  <Avatar
                    avatarProfilePublicId={participant.avatarProfilePublicId}
                    avatarTimestamp={participant.avatarTimestamp}
                    name={participant.name}
                    color={participant.color}
                    size="xl"
                    hideTooltip
                  />
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-md text-base-12 leading-none">
                      {participant.name}
                    </span>
                    <div className="text-base-11 flex flex-row items-center gap-1 leading-none">
                      {participant.address && (
                        <span className="text-xs font-medium">
                          {participant.address}
                        </span>
                      )}
                      <AvatarIcon
                        avatarProfilePublicId={
                          participant.avatarProfilePublicId
                        }
                        size="sm"
                        withDot={!!participant.address}
                      />
                      {participant.type === 'contact' &&
                        participant.signatureHtml && (
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <div className="flex cursor-pointer items-center gap-1 text-xs">
                                <Dot />
                                <PenNib />
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-fit">
                              <div className="flex flex-col gap-2">
                                <span className="text-base-11 text-xs uppercase">
                                  Signature
                                </span>
                                <Separator />
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: participant.signatureHtml
                                  }}
                                  className="w-full"
                                />
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
});
