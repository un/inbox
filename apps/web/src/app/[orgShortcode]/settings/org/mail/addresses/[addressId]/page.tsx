'use client';

import {
  ArrowLeft,
  Check,
  Pencil,
  SpinnerGap,
  SquaresFour
} from '@phosphor-icons/react';
import { Checkbox } from '@/src/components/shadcn-ui/checkbox';
import { platform, type RouterOutputs } from '@/src/lib/trpc';
import { Button } from '@/src/components/shadcn-ui/button';
import { Badge } from '@/src/components/shadcn-ui/badge';
import { Input } from '@/src/components/shadcn-ui/input';
import { useOrgShortcode } from '@/src/hooks/use-params';
import { useCallback, useMemo, useState } from 'react';
import { Avatar } from '@/src/components/avatar';
import { type TypeId } from '@u22n/utils/typeid';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';

export default function Page() {
  const orgShortcode = useOrgShortcode();
  const { addressId } = useParams<{ addressId: TypeId<'emailIdentities'> }>();

  const { data: emailInfo, isLoading } =
    platform.org.mail.emailIdentities.getEmailIdentity.useQuery({
      orgShortcode,
      emailIdentityPublicId: addressId
    });

  return (
    <div className="flex h-full w-full flex-col gap-2 p-4">
      <div className="flex w-full gap-4 py-2">
        <Button
          asChild
          size="icon"
          variant="outline">
          <Link href="./">
            <ArrowLeft className="size-6" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center">
          <h1 className="font-display text-2xl leading-5">
            View Email Address
          </h1>
        </div>
      </div>
      {isLoading && (
        <div className="flex w-full justify-center gap-2 text-center font-bold">
          <SpinnerGap
            className="size-4 animate-spin"
            size={16}
          />
          Loading...
        </div>
      )}
      {emailInfo ? (
        <EmailInfo initialData={emailInfo} />
      ) : (
        !isLoading && (
          <div className="flex h-full flex-1 flex-col items-center justify-center gap-2">
            <div className="text-lg font-bold">Address not found</div>
            <Button
              asChild
              className="w-fit">
              <Link href="./">Go Back</Link>
            </Button>
          </div>
        )
      )}
    </div>
  );
}

type InitialData =
  RouterOutputs['org']['mail']['emailIdentities']['getEmailIdentity'];

type EmailInfo = {
  initialData: InitialData;
};

function EmailInfo({ initialData }: EmailInfo) {
  return (
    <>
      <div>
        <div className="text-base-11 font-bold uppercase">Email Address</div>
        <div>
          {`${initialData.emailIdentityData?.username}@${initialData.emailIdentityData?.domainName}`}
        </div>
      </div>
      <div>
        <div className="text-base-11 font-bold uppercase">
          Forwarding Address
        </div>
        <div>{initialData.emailIdentityData?.forwardingAddress ?? 'None'}</div>
      </div>
      <div>
        <div className="text-base-11 font-bold uppercase">Send Name</div>
        <EditableSendName
          name={initialData.emailIdentityData?.sendName ?? ''}
          emailIdentityPublicId={initialData.emailIdentityData?.publicId}
        />
      </div>
      <div>
        <div className="text-base-11 font-bold uppercase">Catch All</div>
        <div>
          <Badge className="uppercase">
            {initialData.emailIdentityData?.isCatchAll ? 'Yes' : 'No'}
          </Badge>
        </div>
      </div>
      <div>
        <div className="text-base-11 font-bold uppercase">
          Authorized Senders
        </div>
        <div className="flex flex-col gap-2 py-2">
          <SenderList initialData={initialData} />
        </div>
      </div>
      <div>
        <div className="text-base-11 font-bold uppercase">Delivers To</div>
        <div className="flex flex-col gap-2 py-2">
          <DestinationList initialData={initialData} />
        </div>
      </div>
    </>
  );
}

function EditableSendName({
  name,
  emailIdentityPublicId
}: {
  name: string;
  emailIdentityPublicId?: TypeId<'emailIdentities'>;
}) {
  const [editMode, setEditMode] = useState(false);
  const [newName, setNewName] = useState(name);
  const orgShortcode = useOrgShortcode();
  const utils = platform.useUtils();

  const { mutate: setSendName, isPending } =
    platform.org.mail.emailIdentities.setSendName.useMutation({
      onSuccess: () => {
        void utils.org.mail.emailIdentities.getEmailIdentity.invalidate();
        setEditMode(false);
      }
    });

  return editMode ? (
    <div className="flex items-center gap-2">
      <Input
        label="Send Name"
        value={newName}
        disabled={isPending}
        onChange={(e) => setNewName(e.target.value)}
      />
      <Button
        variant="ghost"
        onClick={() => {
          if (newName.trim() === '' || newName.trim() === name) {
            setNewName(name);
            setEditMode(false);
          } else {
            if (!emailIdentityPublicId)
              return toast.error('Email identity not found');
            setSendName({
              orgShortcode,
              emailIdentityPublicId,
              sendName: newName
            });
          }
        }}
        loading={isPending}
        size="icon">
        <Check
          size={16}
          className="size-4"
        />
      </Button>
    </div>
  ) : (
    <div className="flex gap-2">
      <div>{name || 'None'}</div>
      <Button
        variant="outline"
        onClick={() => setEditMode(true)}
        size="icon-sm">
        <Pencil
          size={16}
          className="size-4"
        />
      </Button>
    </div>
  );
}

function SenderList({ initialData }: { initialData: InitialData }) {
  const orgShortcode = useOrgShortcode();
  const utils = platform.useUtils();
  const { data: spaces, isLoading } = platform.spaces.getAllOrgSpaces.useQuery({
    orgShortcode
  });
  const { data: orgMembers } =
    platform.org.users.members.getOrgMembersList.useQuery({ orgShortcode });
  const { data: orgTeams } = platform.org.users.teams.getOrgTeams.useQuery({
    orgShortcode
  });

  const clearCache = useCallback(() => {
    void utils.org.mail.emailIdentities.getEmailIdentity.invalidate();
    void utils.org.mail.emailIdentities.getOrgEmailIdentities.reset();
    void utils.org.mail.emailIdentities.getUserEmailIdentities.reset();
  }, [utils]);

  const { mutate: addSender, isPending: isAdding } =
    platform.org.mail.emailIdentities.addSender.useMutation({
      onSuccess: () => clearCache()
    });
  const { mutate: removeSender, isPending: isRemoving } =
    platform.org.mail.emailIdentities.removeSender.useMutation({
      onSuccess: () => clearCache()
    });

  const senders = useMemo(
    () =>
      initialData.emailIdentityData?.authorizedSenders
        .map(
          (sender) =>
            sender.space?.publicId ??
            sender.orgMember?.publicId ??
            sender.team?.publicId
        )
        .filter((id) => typeof id === 'string') ?? [],
    [initialData.emailIdentityData?.authorizedSenders]
  );

  return isLoading ? (
    <div className="flex items-center gap-2 text-center font-bold">
      <SpinnerGap
        className="size-4 animate-spin"
        size={16}
      />
      Loading...
    </div>
  ) : (
    <div className="flex flex-col gap-2">
      <span className="text-base-11 text-xs font-bold uppercase">Spaces</span>
      {spaces?.spaces.map((space) => (
        <div
          key={space.publicId}
          className="flex items-center gap-2">
          <Checkbox
            disabled={isAdding || isRemoving}
            checked={senders.includes(space.publicId)}
            onCheckedChange={(checked) => {
              if (!initialData.emailIdentityData) return;
              if (checked) {
                addSender({
                  orgShortcode,
                  emailIdentityPublicId:
                    initialData.emailIdentityData?.publicId,
                  sender: space.publicId
                });
              } else {
                removeSender({
                  orgShortcode,
                  emailIdentityPublicId:
                    initialData.emailIdentityData?.publicId,
                  sender: space.publicId
                });
              }
            }}
          />
          <div
            className="flex size-6 min-h-6 min-w-6 items-center justify-center rounded-sm"
            style={{
              backgroundColor: `var(--${space.color}4)`,
              color: `var(--${space.color}9)`
            }}>
            <SquaresFour
              className="h-4 w-4"
              weight="bold"
            />
          </div>
          <span className="text-slate-12 h-full truncate font-medium">
            {space.name}
          </span>
        </div>
      ))}
      <span className="text-base-11 text-xs font-bold uppercase">Teams</span>
      {orgTeams?.teams.map((team) => (
        <div
          key={team.publicId}
          className="flex items-center gap-2">
          <Checkbox
            disabled={isAdding || isRemoving}
            checked={senders.includes(team.publicId)}
            onCheckedChange={(checked) => {
              if (!initialData.emailIdentityData) return;
              if (checked) {
                addSender({
                  orgShortcode,
                  emailIdentityPublicId:
                    initialData.emailIdentityData?.publicId,
                  sender: team.publicId
                });
              } else {
                removeSender({
                  orgShortcode,
                  emailIdentityPublicId:
                    initialData.emailIdentityData?.publicId,
                  sender: team.publicId
                });
              }
            }}
          />
          <Avatar
            name={team.name}
            avatarProfilePublicId={team.publicId}
            avatarTimestamp={team.avatarTimestamp}
            size="md"
            hideTooltip
          />
          <span className="text-slate-12 h-full truncate font-medium">
            {team.name}
          </span>
        </div>
      ))}
      <span className="text-base-11 text-xs font-bold uppercase">
        Org Member
      </span>
      {orgMembers?.members?.map((orgMember) => (
        <div
          key={orgMember.publicId}
          className="flex items-center gap-2">
          <Checkbox
            disabled={isAdding || isRemoving}
            checked={senders.includes(orgMember.publicId)}
            onCheckedChange={(checked) => {
              if (!initialData.emailIdentityData) return;
              if (checked) {
                addSender({
                  orgShortcode,
                  emailIdentityPublicId:
                    initialData.emailIdentityData?.publicId,
                  sender: orgMember.publicId
                });
              } else {
                removeSender({
                  orgShortcode,
                  emailIdentityPublicId:
                    initialData.emailIdentityData?.publicId,
                  sender: orgMember.publicId
                });
              }
            }}
          />
          <Avatar
            name={`${orgMember.profile.firstName ?? orgMember.profile.handle} ${orgMember.profile.lastName ?? ''}`.trim()}
            avatarProfilePublicId={orgMember.profile.publicId}
            avatarTimestamp={orgMember.profile.avatarTimestamp}
            size="md"
            hideTooltip
          />
          <span className="text-slate-12 h-full truncate font-medium">
            {`${orgMember.profile.firstName ?? orgMember.profile.handle} ${orgMember.profile.lastName ?? ''}`.trim()}
          </span>
        </div>
      ))}
    </div>
  );
}

function DestinationList({ initialData }: { initialData: InitialData }) {
  const orgShortcode = useOrgShortcode();
  const utils = platform.useUtils();
  const { data: spaces, isLoading } = platform.spaces.getAllOrgSpaces.useQuery({
    orgShortcode
  });

  const destinations = useMemo(
    () =>
      initialData.emailIdentityData?.routingRules.destinations
        .map((destination) => destination.space?.publicId)
        .filter((id) => typeof id === 'string') ?? [],
    [initialData.emailIdentityData?.routingRules.destinations]
  );

  const clearCache = useCallback(() => {
    void utils.org.mail.emailIdentities.getEmailIdentity.invalidate();
    void utils.org.mail.emailIdentities.getOrgEmailIdentities.reset();
    void utils.org.mail.emailIdentities.getUserEmailIdentities.reset();
  }, [utils]);

  const { mutate: addDestination, isPending: isAdding } =
    platform.org.mail.emailIdentities.addDestination.useMutation({
      onSuccess: () => clearCache()
    });
  const { mutate: removeDestination, isPending: isRemoving } =
    platform.org.mail.emailIdentities.removeDestination.useMutation({
      onSuccess: () => clearCache()
    });

  return isLoading ? (
    <div className="flex items-center gap-2 text-center font-bold">
      <SpinnerGap
        className="size-4 animate-spin"
        size={16}
      />
      Loading...
    </div>
  ) : (
    <div className="flex flex-col gap-2">
      {spaces?.spaces.map((space) => (
        <div
          key={space.publicId}
          className="flex items-center gap-2">
          <Checkbox
            disabled={
              isAdding ||
              isRemoving ||
              (destinations.length === 1 && destinations[0] === space.publicId)
            }
            checked={destinations.includes(space.publicId)}
            onCheckedChange={(checked) => {
              if (!initialData.emailIdentityData) return;
              if (checked) {
                addDestination({
                  orgShortcode,
                  emailIdentityPublicId:
                    initialData.emailIdentityData?.publicId,
                  destination: space.publicId
                });
              } else {
                removeDestination({
                  orgShortcode,
                  emailIdentityPublicId:
                    initialData.emailIdentityData?.publicId,
                  destination: space.publicId
                });
              }
            }}
          />
          <div
            className="flex size-6 min-h-6 min-w-6 items-center justify-center rounded-sm"
            style={{
              backgroundColor: `var(--${space.color}4)`,
              color: `var(--${space.color}9)`
            }}>
            <SquaresFour
              className="h-4 w-4"
              weight="bold"
            />
          </div>
          <span className="text-slate-12 h-full truncate font-medium">
            {space.name}
          </span>
        </div>
      ))}
    </div>
  );
}
