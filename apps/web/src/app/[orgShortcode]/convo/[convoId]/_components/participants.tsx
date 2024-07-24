import { type formatParticipantData } from '../../utils';
import { Avatar, AvatarIcon } from '@/src/components/avatar';
import { Button } from '@/src/components/shadcn-ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/src/components/shadcn-ui/drawer';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/src/components/shadcn-ui/hover-card';
import { Separator } from '@/src/components/shadcn-ui/separator';
import { Dot, PenNib, X } from '@phosphor-icons/react';
export function Participants({
  participants
}: {
  participants: NonNullable<ReturnType<typeof formatParticipantData>>[];
}) {
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
  orderedParticipants.push(...participants.filter((p) => p.role === 'watcher'));

  const assignedParticipantIds = orderedParticipants
    .filter((p) => p.role === 'assigned')
    .map((p) => p.participantPublicId);

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
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
      </DrawerTrigger>
      {/* <DrawerContent className="fixed bottom-0 right-0 mt-24 flex h-full w-[400px] flex-col rounded-t-[10px] bg-base-1"> */}
      <DrawerContent>
        <div className="h-full max-w-sm">
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
}
