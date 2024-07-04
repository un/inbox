'use client';

import { api } from '@/src/lib/trpc';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/src/components/shadcn-ui/select';
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from '@/src/components/shadcn-ui/popover';
import { type TypeId } from '@u22n/utils/typeid';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandLoading,
  useCommandState
} from 'cmdk';
import { useState, useMemo, useEffect } from 'react';
import { At, CaretDown, Check, Paperclip } from '@phosphor-icons/react';
import { z } from 'zod';
import {
  type JSONContent,
  emptyTiptapEditorContent
} from '@u22n/tiptap/react/components';
import { Editor } from '@/src/components/shared/editor';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import useLoading from '@/src/hooks/use-loading';
import { stringify } from 'superjson';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useAddSingleConvo$Cache } from '../utils';
import { Input } from '@/src/components/shadcn-ui/input';
import { Button } from '@/src/components/shadcn-ui/button';
import { useAttachmentUploader } from '@/src/components/shared/attachments';
import { showNewConvoPanel } from '../atoms';
import { Avatar, AvatarIcon } from '@/src/components/avatar';
import { cn } from '@/src/lib/utils';
import { Badge } from '@/src/components/shadcn-ui/badge';

export interface ConvoParticipantShared {
  avatarTimestamp: Date | null;
  name: string;
  address: string | null;
  handle?: string;
  description?: string | null;
  title?: string | null;
  disabled?: boolean;
  keywords: string[];
  own: boolean;
  color: string | null;
}
export interface ConvoParticipantOrgMembers extends ConvoParticipantShared {
  type: 'orgMember';
  publicId: TypeId<'orgMembers'>;
  avatarPublicId: TypeId<'orgMemberProfile'>;
}
export interface ConvoParticipantOrgTeams extends ConvoParticipantShared {
  type: 'team';
  publicId: TypeId<'teams'>;
  avatarPublicId: TypeId<'teams'>;
}
export interface ConvoParticipantOrgContacts extends ConvoParticipantShared {
  type: 'contact';
  publicId: TypeId<'contacts'>;
  avatarPublicId: TypeId<'contacts'>;
  screenerStatus: 'pending' | 'approve' | 'reject' | null;
}
export interface NewConvoParticipantEmailAddresses
  extends ConvoParticipantShared {
  type: 'email';
  publicId: string;
  avatarPublicId: null;
}

export type NewConvoParticipant =
  | ConvoParticipantOrgMembers
  | ConvoParticipantOrgTeams
  | ConvoParticipantOrgContacts
  | NewConvoParticipantEmailAddresses;

const selectedParticipantsAtom = atom<NewConvoParticipant[]>([]);
const newEmailParticipantsAtom = atom<string[]>([]);

export default function CreateConvoForm() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);

  const { data: userEmailIdentities, isLoading: emailIdentitiesLoading } =
    api.org.mail.emailIdentities.getUserEmailIdentities.useQuery({
      orgShortCode
    });
  const { data: orgMemberList, isLoading: orgMemberListLoading } =
    api.org.users.members.getOrgMembersList.useQuery({ orgShortCode });
  const { data: orgTeamsData, isLoading: orgTeamsLoading } =
    api.org.users.teams.getOrgTeams.useQuery({ orgShortCode });
  const { data: orgContacts, isLoading: orgContactsLoading } =
    api.org.contacts.getOrgContacts.useQuery({ orgShortCode });

  const { mutateAsync: createConvoFn } =
    api.convos.createNewConvo.useMutation();

  const newEmailParticipants = useAtomValue(newEmailParticipantsAtom);
  const selectedParticipants = useAtomValue(selectedParticipantsAtom);

  const router = useRouter();

  const [selectedEmailIdentity, setSelectedEmailIdentity] = useState<
    string | null
  >(null);
  const [topic, setTopic] = useState('');
  const { attachments, openFilePicker, getTrpcUploadFormat, AttachmentArray } =
    useAttachmentUploader();

  // Set default email identity on load
  useEffect(() => {
    setSelectedEmailIdentity((prev) => {
      if (prev) return prev;
      return userEmailIdentities?.emailIdentities[0]?.publicId ?? null;
    });
  }, [userEmailIdentities]);

  const allParticipantsLoaded = useMemo(
    () =>
      ![
        emailIdentitiesLoading,
        orgMemberListLoading,
        orgTeamsLoading,
        orgContactsLoading
      ].every((loading) => loading === false),
    [
      emailIdentitiesLoading,
      orgMemberListLoading,
      orgTeamsLoading,
      orgContactsLoading
    ]
  );

  const allParticipants = useMemo(() => {
    const participants: NewConvoParticipant[] = [];

    if (orgMemberList?.ownMembershipId) {
      const ownOrgMemberData = orgMemberList.members?.find(
        (member) => member.publicId === orgMemberList.ownMembershipId
      );
      if (!ownOrgMemberData) {
        throw new Error('own org member data not found');
      }
      const ownData: ConvoParticipantOrgMembers = {
        type: 'orgMember',
        publicId: ownOrgMemberData.publicId,
        avatarPublicId: ownOrgMemberData.profile.publicId,
        avatarTimestamp: ownOrgMemberData.profile.avatarTimestamp,
        name: `${ownOrgMemberData.profile?.firstName} ${ownOrgMemberData.profile?.lastName ?? ''}`,
        handle: ownOrgMemberData.profile?.handle ?? '',
        title: ownOrgMemberData.profile?.title ?? '',
        keywords: [
          ownOrgMemberData.profile?.firstName,
          ownOrgMemberData.profile?.lastName,
          `@${ownOrgMemberData.profile?.handle ?? ''}`,
          ownOrgMemberData.profile?.title
        ].filter(Boolean) as string[],
        disabled: true,
        own: true,
        address: null,
        color: null
      };
      participants.push(ownData);
    }

    if (orgMemberList?.members) {
      for (const member of orgMemberList.members) {
        if (member.publicId === orgMemberList.ownMembershipId) {
          continue;
        }
        participants.push({
          type: 'orgMember',
          publicId: member.publicId,
          avatarPublicId: member.profile.publicId,
          avatarTimestamp: member.profile.avatarTimestamp,
          name: `${member.profile?.firstName ?? ''} ${member.profile?.lastName ?? ''}`,
          handle: member.profile?.handle ?? '',
          title: member.profile?.title ?? '',
          keywords: [
            member.profile?.firstName,
            member.profile?.lastName,
            `@${member.profile?.handle ?? ''}`,
            member.profile?.title
          ].filter(Boolean) as string[],
          own: false,
          address: null,
          color: null
        });
      }
    }

    if (orgTeamsData?.teams) {
      for (const team of orgTeamsData.teams) {
        participants.push({
          type: 'team',
          publicId: team.publicId,
          avatarPublicId: team.publicId,
          avatarTimestamp: team.avatarTimestamp,
          name: team.name,
          description: team.description,
          color: team.color,
          keywords: [team.name, team.description].filter(Boolean) as string[],
          address: null,
          own: false
        });
      }
    }

    if (orgContacts?.contacts) {
      for (const contact of orgContacts.contacts) {
        participants.push({
          type: 'contact',
          publicId: contact.publicId,
          avatarPublicId: contact.publicId,
          avatarTimestamp: contact.avatarTimestamp,
          name:
            contact.setName ??
            contact.name ??
            `${contact.emailUsername}@${contact.emailDomain}`,
          address: `${contact.emailUsername}@${contact.emailDomain}`,
          keywords: [
            contact.setName,
            contact.name,
            `${contact.emailUsername}@${contact.emailDomain}`
          ].filter(Boolean) as string[],
          screenerStatus: contact.screenerStatus,
          color: null,
          own: false
        });
      }
    }

    if (newEmailParticipants.length > 0) {
      for (const emailParticipant of newEmailParticipants) {
        participants.push({
          type: 'email',
          avatarPublicId: null,
          avatarTimestamp: null,
          publicId: emailParticipant,
          address: null,
          keywords: [emailParticipant],
          color: null,
          own: false,
          name: emailParticipant
        });
      }
    }
    return participants;
  }, [
    orgContacts?.contacts,
    orgMemberList?.members,
    orgMemberList?.ownMembershipId,
    orgTeamsData?.teams,
    newEmailParticipants
  ]);

  const [editorText, setEditorText] = useState<JSONContent>(
    emptyTiptapEditorContent
  );

  const isTextPresent = useMemo(() => {
    const contentArray = editorText?.content;
    if (!contentArray) return false;
    if (contentArray.length === 0) return false;
    if (
      contentArray[0] &&
      (!contentArray[0].content || contentArray[0].content.length === 0)
    )
      return false;
    return true;
  }, [editorText]);

  const isFormValid = useMemo(() => {
    if (
      isTextPresent &&
      topic.length > 0 &&
      selectedParticipants.length > 0 &&
      selectedEmailIdentity
    )
      return true;
    return false;
  }, [isTextPresent, topic, selectedParticipants, selectedEmailIdentity]);

  async function startConvoCreation(type: 'message' | 'comment') {
    const getPublicIdsByType = (
      type: NewConvoParticipant['type'],
      property: keyof NewConvoParticipant = 'publicId'
    ) =>
      selectedParticipants
        .filter((participant) => participant.type === type)
        .map((participant) => participant[property]?.toString())
        .filter((v) => !!v) as string[];

    const participantsOrgMembersPublicIds = getPublicIdsByType('orgMember');
    const participantsTeamsPublicIds = getPublicIdsByType('team');
    const participantsContactsPublicIds = getPublicIdsByType('contact');
    const participantsEmails = getPublicIdsByType('email');

    const firstParticipant = selectedParticipants[0]!;
    const toParticipant:
      | { type: 'email'; emailAddress: string }
      | { type: 'orgMember' | 'team' | 'contact'; publicId: string } =
      firstParticipant.type === 'email'
        ? {
            type: 'email',
            emailAddress: firstParticipant.publicId
          }
        : {
            type: firstParticipant.type,
            publicId: firstParticipant.publicId
          };

    return await createConvoFn({
      firstMessageType: type,
      topic,
      to: toParticipant,
      sendAsEmailIdentityPublicId: selectedEmailIdentity!,
      participantsOrgMembersPublicIds,
      participantsTeamsPublicIds,
      participantsContactsPublicIds,
      participantsEmails,
      message: stringify(editorText),
      attachments: getTrpcUploadFormat(),
      orgShortCode
    });
  }

  const addConvo = useAddSingleConvo$Cache();
  const [, setNewPanelOpen] = useAtom(showNewConvoPanel);

  const { loading: isMessageLoading, run: createConvo } = useLoading(
    async () => await startConvoCreation('message'),
    {
      onError: (err) => {
        toast.error(err.message);
      },
      onSuccess: (data) => {
        toast.success('Convo created, redirecting you to your conversion');
        void addConvo(data.publicId).then(() => {
          setNewPanelOpen(false);
          router.push(`/${orgShortCode}/convo/${data.publicId}`);
        });
      }
    }
  );

  const { loading: isCommentLoading, run: createComment } = useLoading(
    async () => await startConvoCreation('comment'),
    {
      onError: (err) => {
        toast.error(err.message);
      },
      onSuccess: (data) => {
        toast.success('Convo created, redirecting you to your conversion');
        void addConvo(data.publicId).then(() => {
          router.push(`/${orgShortCode}/convo/${data.publicId}`);
        });
      }
    }
  );

  const selectedEmailIdentityString = useMemo(() => {
    if (!selectedEmailIdentity) return null;
    const identity = userEmailIdentities?.emailIdentities.find(
      (e) => e.publicId === selectedEmailIdentity
    );
    return identity
      ? `${identity.sendName} (${identity.username}@${identity.domainName})`
      : null;
  }, [selectedEmailIdentity, userEmailIdentities]);

  return (
    <div className="flex w-full flex-col gap-3 p-3">
      <div className="flex w-full flex-col gap-2 text-sm">
        <h4 className="font-bold">Participants</h4>
        <ParticipantsComboboxPopover
          participants={allParticipants}
          loading={allParticipantsLoaded}
        />
      </div>
      <div className="flex w-full flex-col gap-2 text-sm">
        <h4 className="font-bold">Email Identity</h4>
        <Select
          value={selectedEmailIdentity ?? undefined}
          onValueChange={(value) => {
            setSelectedEmailIdentity(value);
          }}>
          <SelectTrigger className="h-fit">
            <SelectValue>
              {selectedEmailIdentityString ?? 'Select an Email Identity to Use'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent side="bottom">
            {userEmailIdentities?.emailIdentities.map((identity) => (
              <SelectItem
                key={identity.publicId}
                value={identity.publicId}>
                {identity.sendName} ({identity.username}@{identity.domainName})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex w-full flex-col gap-2 text-sm">
        <h4 className="font-bold">Subject</h4>
        <Input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Type a Subject"
          className="h-fit w-full"
        />
      </div>

      <div className="border-base-5 flex max-h-[250px] w-full flex-col gap-1 rounded-md border p-1">
        <Editor
          initialValue={editorText}
          onChange={setEditorText}
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          setEditor={() => {}}
        />

        <AttachmentArray attachments={attachments} />
        <div className="flex flex-row items-center justify-between gap-2">
          <div className="flex flex-row items-center gap-2">
            <Button
              variant={'outline'}
              size={'icon-sm'}
              onClick={() => {
                openFilePicker();
              }}>
              <Paperclip size={16} />
            </Button>
          </div>
          <div className="align-center flex justify-end gap-2">
            <Button
              variant="secondary"
              size={'sm'}
              disabled={!isFormValid || isMessageLoading}
              onClick={() => createComment()}>
              Comment
            </Button>
            <Button
              size={'sm'}
              loading={isMessageLoading}
              disabled={!isFormValid || isCommentLoading}
              onClick={() => createConvo()}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type ParticipantsComboboxPopoverProps = {
  participants: NewConvoParticipant[];
  loading: boolean;
};

function ParticipantsComboboxPopover({
  participants,
  loading
}: ParticipantsComboboxPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useAtom(
    selectedParticipantsAtom
  );

  const [currentSelectValue, setCurrentSelectValue] = useState('');
  const hasExternalParticipants = useMemo(
    () =>
      selectedParticipants.some(
        (participant) =>
          participant.type === 'email' || participant.type === 'contact'
      ),
    [selectedParticipants]
  );

  return (
    <div className="flex w-full items-center space-x-4">
      <Popover
        open={open}
        onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={'outline'}
            className="h-fit w-full justify-between">
            {selectedParticipants.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedParticipants.map((participant, i) => {
                  let info = '';
                  switch (participant.type) {
                    case 'orgMember':
                      info = participant.name;
                      break;
                    case 'team':
                      info = participant.name;
                      break;
                    case 'contact':
                      info = participant.name
                        ? `${participant.name} (${participant.address!})`
                        : participant.address!;
                      break;
                    case 'email':
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      info = participant.address!;
                      break;
                  }
                  return (
                    <div
                      key={participant.publicId}
                      className="flex items-center gap-2">
                      <div className="flex items-center justify-center gap-2">
                        <Avatar
                          avatarProfilePublicId={
                            participant.avatarPublicId ?? 'no_avatar'
                          }
                          avatarTimestamp={participant.avatarTimestamp}
                          name={participant.name ?? ''}
                          color={
                            participant.color
                              ? (participant.color as 'base')
                              : 'base'
                          }
                          size="sm"
                          hideTooltip
                        />
                        <p className="text-muted-foreground text-sm">
                          {participant.own && participant.own
                            ? 'You (already a participant)'
                            : `${participant.name} ${participant.title ? `(${participant.title})` : ''}`}
                        </p>
                        <AvatarIcon
                          avatarProfilePublicId={
                            participant.avatarPublicId ?? 'no_avatar'
                          }
                          size="sm"
                          address={participant.address ?? undefined}
                          withDot={!!participant.address}
                        />
                      </div>
                      {i === 0 &&
                        selectedParticipants.length > 1 &&
                        hasExternalParticipants && (
                          <Badge variant="outline">CC:</Badge>
                        )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                <p>Search or type an Email address</p>
                <CaretDown size={16} />
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-2"
          side="bottom"
          align="start">
          <Command
            value={currentSelectValue}
            onValueChange={(value) => setCurrentSelectValue(value)}
            className="flex flex-col gap-3"
            filter={(value, search, keywords) =>
              (
                keywords?.join(' ').toLowerCase() ?? value.toLowerCase()
              ).includes(search.toLowerCase())
                ? 1
                : 0
            }>
            <CommandInput asChild>
              <Input
                className="h-8"
                placeholder="Search or type an Email address"
                onKeyDown={(e) => {
                  // Hack to prevent cmdk from preventing Home and End keys
                  if (e.key === 'Home' || e.key === 'End') {
                    e.stopPropagation();
                  }
                }}
                onFocus={() => {
                  // Remove current select value when input is focused
                  setCurrentSelectValue('');
                }}
              />
            </CommandInput>
            <CommandList className="max-h-[calc(var(--radix-popover-content-available-height)*0.9)] overflow-scroll">
              {loading && <CommandLoading>Loading Participants</CommandLoading>}
              <CommandGroup className="flex flex-col gap-2 px-1">
                {!loading && <EmptyStateHandler />}
                {participants.map((participant) => (
                  <CommandItem
                    key={participant.publicId}
                    value={participant.publicId}
                    keywords={participant.keywords}
                    onSelect={(value) => {
                      setSelectedParticipants((prev) =>
                        prev.find((p) => p.publicId === value)
                          ? prev.filter((p) => p.publicId !== value)
                          : prev.concat(participant)
                      );
                    }}>
                    <Button
                      variant={'ghost'}
                      className={cn(
                        'my-1 w-full justify-start px-1',
                        selectedParticipants.find(
                          (p) => p.publicId === participant.publicId
                        )
                          ? 'text-gray-10'
                          : 'text-muted-foreground'
                      )}
                      disabled={
                        participant.type === 'orgMember' && participant.disabled
                      }
                      onFocus={() =>
                        setCurrentSelectValue(participant.publicId)
                      }>
                      <div className="flex items-center justify-center gap-2">
                        <Avatar
                          avatarProfilePublicId={
                            participant.avatarPublicId ?? 'no_avatar'
                          }
                          avatarTimestamp={participant.avatarTimestamp}
                          name={participant.name ?? ''}
                          color={
                            participant.color
                              ? (participant.color as 'base')
                              : 'base'
                          }
                          size="sm"
                          hideTooltip
                        />
                        <p className="text-muted-foreground text-sm">
                          {participant.own && participant.own
                            ? 'You (already a participant)'
                            : `${participant.name} ${participant.title ? `(${participant.title})` : ''}`}
                        </p>
                        <AvatarIcon
                          avatarProfilePublicId={
                            participant.avatarPublicId ?? 'no_avatar'
                          }
                          size="sm"
                          address={participant.address ?? undefined}
                          withDot={!!participant.address}
                        />
                      </div>

                      {selectedParticipants.find(
                        (p) => p.publicId === participant.publicId
                      ) ? (
                        <Check size={16} />
                      ) : null}
                    </Button>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function EmptyStateHandler() {
  const isEmpty = useCommandState((state) => state.filtered.count === 0);
  const email = useCommandState((state) => state.search);
  const isValidEmail = useMemo(
    () => z.string().email().safeParse(email).success,
    [email]
  );

  const setEmailParticipants = useSetAtom(newEmailParticipantsAtom);
  const addSelectedParticipant = useSetAtom(selectedParticipantsAtom);

  const addEmailParticipant = (email: string) => {
    setEmailParticipants((prev) =>
      prev.includes(email) ? prev : prev.concat(email)
    );
    addSelectedParticipant((prev) =>
      prev.find((p) => p.publicId === email)
        ? prev
        : prev.concat({
            type: 'email',
            publicId: email,
            address: email,
            keywords: [email],
            avatarPublicId: null,
            avatarTimestamp: null,
            color: null,
            own: false,
            name: email
          })
    );
  };

  return isEmpty && isValidEmail ? (
    <CommandItem
      key={email}
      value={email}
      forceMount
      onKeyDown={(e) => {
        // Submit email on Enter key
        if (e.key === 'Enter') {
          addEmailParticipant(email);
        }
      }}>
      <Button
        variant={'ghost'}
        className="my-1 w-full justify-start px-1"
        color="gray"
        onClick={() => {
          addEmailParticipant(email);
        }}>
        <At className="mr-2 h-4 w-4" />
        <p className="text-sm">Add {email}</p>
      </Button>
    </CommandItem>
  ) : (
    <CommandEmpty className="px-2 text-sm font-bold">
      No participants found. Try typing an email address.
    </CommandEmpty>
  );
}
