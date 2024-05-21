'use client';

import { cn, generateAvatarUrl, getInitials } from '@/src/lib/utils';
import { Avatar, Box, HoverCard } from '@radix-ui/themes';
import { CaretUp, CaretDown } from '@phosphor-icons/react';
import { useState } from 'react';
import { type formatParticipantData } from '../../utils';
import { memo } from 'react';
import { type TypeId } from '@u22n/utils/typeid';
import { Badge } from '@/src/components/shadcn-ui/badge';

export function ContextPanel({
  participants,
  attachments
}: {
  participants: NonNullable<ReturnType<typeof formatParticipantData>>[];
  attachments: {
    name: string;
    url: string;
    type: string;
    publicId: TypeId<'convoAttachments'>;
  }[];
}) {
  const [participantOpen, setParticipantOpen] = useState(false);

  return (
    <div className=" flex h-full w-80 min-w-80 flex-col">
      <div className="border-gray-11 flex h-full w-full flex-col">
        <div className="flex w-full flex-col">
          <div
            className="flex w-full flex-col p-1"
            onClick={() => setParticipantOpen((open) => !open)}>
            <span className="select-none p-2">Participants</span>
            {participantOpen ? <CaretUp size={14} /> : <CaretDown size={14} />}
          </div>
          {participants.length === 0 && <span className="p-2">Loading...</span>}
          <div className=" flex flex-col px-2">
            {participants.map((participant, i) => (
              <div
                className="flex flex-col gap-2"
                key={participant.participantPublicId}>
                <HoverCard.Root>
                  <HoverCard.Trigger>
                    <Box
                      style={{ zIndex: 100 + i }}
                      className={cn(
                        !participantOpen && i !== 0 ? '-ml-2' : '',
                        'dark:outline-graydark-1 dark:bg-graydark-1 outline-gray-1 bg-gray-1 w-fit rounded-full outline'
                      )}>
                      <Avatar
                        src={
                          generateAvatarUrl({
                            avatarTimestamp: participant.avatarTimestamp,
                            publicId: participant.avatarProfilePublicId,
                            size: 'lg'
                          }) ?? undefined
                        }
                        fallback={getInitials(participant.name)}
                        radius="full"
                      />
                    </Box>
                  </HoverCard.Trigger>
                  <HoverCard.Content
                    className="max-w-[300px] px-2 py-1"
                    side={participantOpen ? 'left' : 'bottom'}>
                    <div className="flex flex-col">
                      <span className="truncate">{participant.name}</span>
                      {participantOpen && participant.signatureHtml && (
                        <div className="flex flex-col">
                          <span className="uppercase">Signature</span>
                          <SignatureHTML html={participant.signatureHtml} />
                        </div>
                      )}
                    </div>
                  </HoverCard.Content>
                </HoverCard.Root>
                {participantOpen && (
                  <span className="truncate">{participant.name}</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 px-2">
            <span className="font-bold">Attachments</span>
            {attachments.length > 0 ? (
              <div className="flex w-full flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <a
                    target="_blank"
                    key={attachment.publicId}
                    href={attachment.url}>
                    <Badge className="flex w-fit max-w-full truncate p-1">
                      {attachment.name}
                    </Badge>
                  </a>
                ))}
              </div>
            ) : (
              <span className="text-xs">No Attachments</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const SignatureHTML = memo(
  function SIgnatureHTML({ html }: { html: string }) {
    return (
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        className="w-full"
      />
    );
  },
  (prev, curr) => prev.html === curr.html
);
