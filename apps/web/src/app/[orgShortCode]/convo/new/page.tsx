'use client';

import { api } from '@/src/lib/trpc';
import { cn, generateAvatarUrl, getInitials } from '@/src/lib/utils';
import {
  Avatar,
  Badge,
  Button,
  Flex,
  Heading,
  Popover,
  Select,
  Text,
  TextField
} from '@radix-ui/themes';
import { type TypeId } from '@u22n/utils';
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
import { useState, useMemo, Fragment } from 'react';
import {
  type Icon,
  User,
  Users,
  AddressBook,
  At,
  CaretDown,
  Check
} from '@phosphor-icons/react';
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
import {
  AttachmentButton,
  type ConvoAttachmentUpload
} from '@/src/components/shared/attachment-button';
import { useAddSingleConvo$Cache } from '../utils';

interface ConvoParticipantOrgMembers {
  type: 'orgMember';
  icon: Icon;
  publicId: TypeId<'orgMembers'>;
  avatarTimestamp: Date | null;
  profilePublicId: TypeId<'orgMemberProfile'>;
  name: string;
  handle: string;
  title: string | null;
  disabled?: boolean;
  keywords: string[];
  own?: boolean;
}
interface ConvoParticipantOrgTeams {
  type: 'team';
  icon: Icon;
  publicId: TypeId<'teams'>;
  avatarTimestamp: Date | null;
  name: string;
  description: string | null;
  color: string | null;
  keywords: string[];
}
interface ConvoParticipantOrgContacts {
  type: 'contact';
  icon: Icon;
  publicId: TypeId<'contacts'>;
  avatarTimestamp: Date | null;
  name: string | null;
  address: string;
  keywords: string[];
  screenerStatus: 'pending' | 'approve' | 'reject' | null;
}
interface NewConvoParticipantEmailAddresses {
  type: 'email';
  icon: Icon;
  publicId: string;
  address: string;
  keywords: string[];
}

type NewConvoParticipant =
  | ConvoParticipantOrgMembers
  | ConvoParticipantOrgTeams
  | ConvoParticipantOrgContacts
  | NewConvoParticipantEmailAddresses;

const selectedParticipantsAtom = atom<NewConvoParticipant[]>([]);
const newEmailParticipantsAtom = atom<string[]>([]);
const attachmentsAtom = atom<ConvoAttachmentUpload[]>([]);

export default function Page() {
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
  const attachments = useAtomValue(attachmentsAtom);

  const router = useRouter();

  const [selectedEmailIdentity, setSelectedEmailIdentity] = useState<
    string | null
  >(null);
  const [topic, setTopic] = useState('');

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
        icon: User,
        publicId: ownOrgMemberData.publicId,
        profilePublicId: ownOrgMemberData.profile.publicId,
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
        own: true
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
          icon: User,
          publicId: member.publicId,
          profilePublicId: member.profile.publicId,
          avatarTimestamp: member.profile.avatarTimestamp,
          name: `${member.profile?.firstName ?? ''} ${member.profile?.lastName ?? ''}`,
          handle: member.profile?.handle ?? '',
          title: member.profile?.title ?? '',
          keywords: [
            member.profile?.firstName,
            member.profile?.lastName,
            `@${member.profile?.handle ?? ''}`,
            member.profile?.title
          ].filter(Boolean) as string[]
        });
      }
    }

    if (orgTeamsData?.teams) {
      for (const team of orgTeamsData.teams) {
        participants.push({
          type: 'team',
          icon: Users,
          publicId: team.publicId,
          avatarTimestamp: team.avatarTimestamp,
          name: team.name,
          description: team.description,
          color: team.color,
          keywords: [team.name, team.description].filter(Boolean) as string[]
        });
      }
    }

    if (orgContacts?.contacts) {
      for (const contact of orgContacts.contacts) {
        participants.push({
          type: 'contact',
          icon: AddressBook,
          publicId: contact.publicId,
          avatarTimestamp: contact.avatarTimestamp,
          name: contact.setName ?? contact.name ?? null,
          address: `${contact.emailUsername}@${contact.emailDomain}`,
          keywords: [
            contact.setName,
            contact.name,
            `${contact.emailUsername}@${contact.emailDomain}`
          ].filter(Boolean) as string[],
          screenerStatus: contact.screenerStatus
        });
      }
    }

    if (newEmailParticipants.length > 0) {
      for (const emailParticipant of newEmailParticipants) {
        participants.push({
          type: 'email',
          icon: At,
          publicId: emailParticipant,
          address: emailParticipant,
          keywords: [emailParticipant]
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

  async function startConvoUnderlying(type: 'message' | 'comment') {
    const getPublicIdsByType = (
      type: NewConvoParticipant['type'],
      property = 'publicId'
    ) =>
      selectedParticipants
        .filter((participant) => participant.type === type)
        .map((participant) =>
          participant[property as keyof NewConvoParticipant].toString()
        );

    const participantsOrgMembersPublicIds = getPublicIdsByType('orgMember');
    const participantsTeamsPublicIds = getPublicIdsByType('team');
    const participantsContactsPublicIds = getPublicIdsByType('contact');
    const participantsEmails = getPublicIdsByType('email', 'address');

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
      attachments,
      orgShortCode
    });
  }

  const addConvo = useAddSingleConvo$Cache();

  const { loading: isMessageLoading, run: createConvo } = useLoading(
    async () => await startConvoUnderlying('message'),
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

  const { loading: isCommentLoading, run: createComment } = useLoading(
    async () => await startConvoUnderlying('comment'),
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

  return (
    <Flex
      direction="column"
      gap="3"
      className="w-full p-3">
      <Flex
        direction="column"
        gap="2"
        className="w-full">
        <Heading size="2">Participants</Heading>
        <ParticipantsComboboxPopover
          participants={allParticipants}
          loading={allParticipantsLoaded}
        />
      </Flex>
      <Flex
        direction="column"
        gap="2"
        className="w-full">
        <Heading size="2">Email Identity</Heading>
        <Select.Root
          onValueChange={(value) => {
            setSelectedEmailIdentity(value);
          }}>
          <Select.Trigger placeholder="Select an Email Identity to Use" />
          <Select.Content>
            {userEmailIdentities?.emailIdentities.map((identity) => (
              <Select.Item
                key={identity.publicId}
                value={identity.publicId}>
                {identity.sendName} ({identity.username}@{identity.domainName})
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Flex>
      <Flex
        className="w-full"
        direction="column"
        gap="2">
        <Heading size="2">Subject</Heading>
        <TextField.Root
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Type a Subject"
          className="w-full"
        />
      </Flex>
      <Flex
        className="w-full flex-1"
        direction="column"
        gap="2">
        <Heading size="2">Type Your Message</Heading>
        <Flex className="flex-1">
          <Editor
            initialValue={editorText}
            onChange={setEditorText}
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            setEditor={() => {}}
          />
        </Flex>
      </Flex>
      <Flex
        justify="end"
        gap="2">
        <AttachmentButton attachmentsAtom={attachmentsAtom} />
        <Button
          variant="soft"
          loading={isCommentLoading}
          disabled={!isFormValid || isMessageLoading}
          onClick={() => createComment()}>
          Comment
        </Button>
        <Button
          loading={isMessageLoading}
          disabled={!isFormValid || isCommentLoading}
          onClick={() => createConvo()}>
          Send
        </Button>
      </Flex>
    </Flex>
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
      <Popover.Root
        open={open}
        onOpenChange={setOpen}>
        <Popover.Trigger>
          <Button
            variant="surface"
            className="h-fit w-full justify-between px-2 py-1">
            {selectedParticipants.length > 0 ? (
              <Flex
                gap="2"
                wrap="wrap">
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
                        ? `${participant.name} (${participant.address})`
                        : participant.address;
                      break;
                    case 'email':
                      info = participant.address;
                      break;
                  }
                  return (
                    <Fragment key={participant.publicId}>
                      <Badge
                        color={i === 0 ? undefined : 'gray'}
                        variant="surface"
                        className="">
                        <Avatar
                          src={
                            participant.type === 'email'
                              ? undefined
                              : generateAvatarUrl({
                                  publicId:
                                    participant.type === 'orgMember'
                                      ? participant.profilePublicId
                                      : participant.publicId,
                                  avatarTimestamp: participant.avatarTimestamp,
                                  size: 'sm'
                                }) ?? undefined
                          }
                          fallback={getInitials(info.replace(/\(.+\)/, ''))}
                          size="1"
                          className="rounded-full"
                        />
                        <Text>{info}</Text>
                      </Badge>
                      {i === 0 &&
                        selectedParticipants.length > 1 &&
                        hasExternalParticipants && (
                          <div className="border-gray-10 dark:border-graydark-10 my-1 flex h-full items-center justify-center border-l-2 px-1">
                            CC:
                          </div>
                        )}
                    </Fragment>
                  );
                })}
              </Flex>
            ) : (
              <>
                <Text>Search or type an Email address</Text>
                <CaretDown size={16} />
              </>
            )}
          </Button>
        </Popover.Trigger>
        <Popover.Content
          className="p-2"
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
              <TextField.Root
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
            <CommandList>
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
                      variant="ghost"
                      className="my-1 w-full justify-start px-1"
                      color={
                        selectedParticipants.find(
                          (p) => p.publicId === participant.publicId
                        )
                          ? undefined
                          : 'gray'
                      }
                      disabled={
                        participant.type === 'orgMember' && participant.disabled
                      }
                      onFocus={() =>
                        setCurrentSelectValue(participant.publicId)
                      }>
                      <participant.icon className={cn('mr-2 h-4 w-4')} />
                      {participant.type === 'orgMember' ? (
                        <Flex
                          gap="2"
                          align="center"
                          justify="center">
                          <Avatar
                            src={
                              generateAvatarUrl({
                                publicId: participant.profilePublicId,
                                avatarTimestamp: participant.avatarTimestamp,
                                size: 'sm'
                              }) ?? undefined
                            }
                            fallback={getInitials(participant.name)}
                            size="1"
                            className="rounded-full"
                          />
                          <Text size="2">
                            {participant.own
                              ? 'You (already a participant)'
                              : `${participant.name} ${participant.title ? `(${participant.title})` : ''}`}
                          </Text>
                        </Flex>
                      ) : participant.type === 'team' ? (
                        <Flex
                          gap="2"
                          align="center"
                          justify="center">
                          <Avatar
                            src={
                              generateAvatarUrl({
                                publicId: participant.publicId,
                                avatarTimestamp: participant.avatarTimestamp,
                                size: 'sm'
                              }) ?? undefined
                            }
                            fallback={getInitials(participant.name)}
                            size="1"
                            className="rounded-full"
                          />
                          <Text size="2">{participant.name}</Text>
                        </Flex>
                      ) : participant.type === 'contact' ? (
                        <Flex
                          gap="2"
                          align="center"
                          justify="center">
                          <Avatar
                            src={
                              generateAvatarUrl({
                                publicId: participant.publicId,
                                avatarTimestamp: participant.avatarTimestamp,
                                size: 'sm'
                              }) ?? undefined
                            }
                            fallback={getInitials(
                              participant.name ?? participant.address
                            )}
                            size="1"
                            className="rounded-full"
                          />
                          <Text size="2">
                            {participant.name} {participant.name && '-'}{' '}
                            {participant.address}
                          </Text>
                        </Flex>
                      ) : (
                        <Flex
                          gap="2"
                          align="center"
                          justify="center">
                          <Avatar
                            fallback={getInitials(participant.address)}
                            size="1"
                            className="rounded-full"
                          />
                          <Text size="2">{participant.address}</Text>
                        </Flex>
                      )}
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
        </Popover.Content>
      </Popover.Root>
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
            icon: At,
            publicId: email,
            address: email,
            keywords: [email]
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
        variant="ghost"
        className="my-1 w-full justify-start px-1"
        color="gray"
        onClick={() => {
          addEmailParticipant(email);
        }}>
        <At className="mr-2 h-4 w-4" />
        <Text size="2">Add {email}</Text>
      </Button>
    </CommandItem>
  ) : (
    <CommandEmpty className="px-2 text-sm font-bold">
      No participants found. Try typing an email address.
    </CommandEmpty>
  );
}
