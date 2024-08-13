'use client';

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
import {
  At,
  CaretDown,
  ChatTeardropText,
  Check,
  Paperclip,
  PaperPlaneTilt,
  Question
} from '@phosphor-icons/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/src/components/shadcn-ui/select';
import {
  useState,
  useMemo,
  useEffect,
  type Dispatch,
  type SetStateAction,
  useRef,
  useCallback
} from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/src/components/shadcn-ui/hover-card';
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from '@/src/components/shadcn-ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/src/components/shadcn-ui/tooltip';
import {
  type JSONContent,
  type EditorFunctions
} from '@u22n/tiptap/components';
import { useOrgScopedRouter, useOrgShortcode } from '@/src/hooks/use-params';
import { useAttachmentUploader } from '@/src/components/shared/attachments';
import { useComposingDraft } from '@/src/stores/draft-store';
import { Avatar, AvatarIcon } from '@/src/components/avatar';
import { Button } from '@/src/components/shadcn-ui/button';
import { Input } from '@/src/components/shadcn-ui/input';
import { Badge } from '@/src/components/shadcn-ui/badge';
import { useIsMobile } from '@/src/hooks/use-is-mobile';
import { emptyTiptapEditorContent } from '@u22n/tiptap';
import { useMutation } from '@tanstack/react-query';
import { useAddSingleConvo$Cache } from '../utils';
import { Editor } from '@/src/components/editor';
import { type TypeId } from '@u22n/utils/typeid';
import { useDebounce } from '@uidotdev/usehooks';
import { usePrevious } from '@uidotdev/usehooks';
import { showNewConvoPanel } from '../atoms';
import { platform } from '@/src/lib/trpc';
import { cn } from '@/src/lib/utils';
import { ms } from '@u22n/utils/ms';
import { useSetAtom } from 'jotai';
import { toast } from 'sonner';
import { z } from 'zod';

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

export default function CreateConvoForm({
  initialEmails = [],
  initialSubject = ''
}: {
  initialEmails?: string[];
  initialSubject?: string;
}) {
  const orgShortcode = useOrgShortcode();
  const { scopedNavigate } = useOrgScopedRouter();
  const lastOrg = usePrevious(orgShortcode);
  const { draft, setDraft, resetDraft } = useComposingDraft();
  const isMobile = useIsMobile();

  const { data: userEmailIdentities, isLoading: emailIdentitiesLoading } =
    platform.org.mail.emailIdentities.getUserEmailIdentities.useQuery(
      {
        orgShortcode
      },
      {
        staleTime: ms('1 hour')
      }
    );
  const { data: orgMemberList, isLoading: orgMemberListLoading } =
    platform.org.users.members.getOrgMembersList.useQuery({ orgShortcode });
  const { data: orgTeamsData, isLoading: orgTeamsLoading } =
    platform.org.users.teams.getOrgTeams.useQuery({ orgShortcode });
  const { data: orgContacts, isLoading: orgContactsLoading } =
    platform.org.contacts.getOrgContacts.useQuery({ orgShortcode });
  const { data: isAdmin } =
    platform.org.users.members.isOrgMemberAdmin.useQuery(
      {
        orgShortcode
      },
      {
        staleTime: ms('1 hour')
      }
    );

  const [newEmailParticipants, setNewEmailParticipants] = useState<string[]>(
    initialEmails.length > 0
      ? Array.from(new Set(initialEmails))
      : draft.participants
          .filter((p) => p.type === 'email')
          .map((p) => p.publicId)
  );

  const [selectedParticipants, setSelectedParticipants] = useState<
    NewConvoParticipant[]
  >(() => {
    if (initialEmails.length > 0) {
      const uniqueEmails = Array.from(new Set(initialEmails));
      const newParticipants = uniqueEmails.map((email) => ({
        type: 'email' as const,
        publicId: email,
        address: email,
        keywords: [email],
        avatarPublicId: null,
        avatarTimestamp: null,
        color: null,
        own: false,
        name: email
      }));
      return newParticipants;
    } else {
      return draft.participants;
    }
  });

  const hasExternalParticipants = useMemo(
    () =>
      selectedParticipants.some(
        (participant) =>
          participant.type === 'email' || participant.type === 'contact'
      ),
    [selectedParticipants]
  );

  const [selectedEmailIdentity, setSelectedEmailIdentity] = useState<
    string | null
  >(draft.from ?? null);
  const [topic, setTopic] = useState(initialSubject || draft.topic);
  const {
    attachments,
    openFilePicker,
    getTrpcUploadFormat,
    removeAllAttachments,
    AttachmentArray,
    canUpload
  } = useAttachmentUploader(draft.attachments);

  const { mutateAsync: createConvoFn } =
    platform.convos.createNewConvo.useMutation({
      onSuccess: () => {
        resetDraft();
        setSelectedParticipants([]);
        removeAllAttachments();
        setTopic('');
        editorRef.current?.clearContent();
        setEditorText(emptyTiptapEditorContent);
      }
    });

  // Set default email identity on load
  useEffect(() => {
    setSelectedEmailIdentity((prev) => {
      if (prev) return prev;
      return (
        userEmailIdentities?.defaultEmailIdentity ??
        userEmailIdentities?.emailIdentities[0]?.publicId ??
        null
      );
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

    return participants;
  }, [
    orgContacts?.contacts,
    orgMemberList?.members,
    orgMemberList?.ownMembershipId,
    orgTeamsData?.teams,
    newEmailParticipants
  ]);

  const [editorText, setEditorText] = useState(draft.content);
  const editorRef = useRef<EditorFunctions>(null);

  // Autosave draft
  const debouncedEditorText = useDebounce(editorText, 500);
  useEffect(() => {
    if (lastOrg && lastOrg !== orgShortcode) return; // Don't autosave if org changes
    setDraft({
      content: debouncedEditorText,
      attachments,
      participants: selectedParticipants,
      topic: topic,
      from: selectedEmailIdentity ?? null
    });
  }, [
    debouncedEditorText,
    setDraft,
    attachments,
    selectedParticipants,
    topic,
    selectedEmailIdentity,
    lastOrg,
    orgShortcode
  ]);

  const emptyEditorChecker = useCallback((editorText: JSONContent) => {
    const contentArray = editorText?.content;
    if (!contentArray) return true;
    if (contentArray.length === 0) return true;
    const firstElementWithContent = contentArray.find(
      (element) => element.content?.length && element.content.length > 0
    );
    if (!firstElementWithContent) return true;
    return false;
  }, []);

  const isTextPresent = useMemo(
    () => emptyEditorChecker(editorText),
    [emptyEditorChecker, editorText]
  );

  const isFormValid = useMemo(() => {
    if (
      (hasExternalParticipants ? selectedEmailIdentity !== null : true) &&
      isTextPresent &&
      topic.length > 0 &&
      selectedParticipants.length > 0
    )
      return true;
    return false;
  }, [
    hasExternalParticipants,
    selectedEmailIdentity,
    isTextPresent,
    topic.length,
    selectedParticipants.length
  ]);

  const canClearDraft = useMemo(
    () => isTextPresent || topic.length > 0 || selectedParticipants.length > 0,
    [isTextPresent, topic.length, selectedParticipants.length]
  );

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

    return createConvoFn({
      firstMessageType: type,
      topic,
      to: toParticipant,
      sendAsEmailIdentityPublicId: selectedEmailIdentity ?? undefined,
      participantsOrgMembersPublicIds,
      participantsTeamsPublicIds,
      participantsContactsPublicIds,
      participantsEmails,
      message: editorText,
      attachments: getTrpcUploadFormat(),
      orgShortcode
    });
  }

  const addConvo = useAddSingleConvo$Cache();
  const setNewPanelOpen = useSetAtom(showNewConvoPanel);

  const {
    mutate: createConvo,
    isPending: isCreating,
    variables: messageType
  } = useMutation({
    mutationFn: (type: 'comment' | 'message') => {
      if (hasExternalParticipants && selectedEmailIdentity === null) {
        throw new Error(
          'Please select an email identity to send the message as.'
        );
      }
      return startConvoCreation(type);
    },
    onSuccess: (data) => {
      toast.success('Convo created, redirecting you to your conversion');

      void addConvo(data.publicId).then(() => {
        resetDraft();
        setNewPanelOpen(false);
        scopedNavigate(`/convo/${data.publicId}`);
      });
    }
  });

  return (
    <div className="flex h-full w-full min-w-0 flex-col gap-3 p-3">
      <div className="flex w-full flex-col gap-2 text-sm">
        <h4 className="font-bold">Participants</h4>
        <ParticipantsComboboxPopover
          participants={allParticipants}
          loading={allParticipantsLoaded}
          selectedParticipants={selectedParticipants}
          setSelectedParticipants={setSelectedParticipants}
          setNewEmailParticipants={setNewEmailParticipants}
        />
      </div>

      <div className="flex w-full flex-col gap-2 text-sm">
        <Input
          label="Subject"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full"
        />
      </div>

      <div
        className={cn(
          'border-base-5 group relative mt-3 flex max-h-[250px] w-full flex-col gap-1 rounded-md border px-2 py-1',
          canClearDraft && 'hover:rounded-tr-none'
        )}>
        {canClearDraft && (
          <Button
            variant="link"
            size="xs"
            className="text-base-11 border-base-5 bg-base-1 absolute -top-5 right-[-1px] h-5 translate-y-4 cursor-pointer rounded-b-none border border-b-0 py-0 text-xs opacity-0 transition-all delay-100 group-hover:translate-y-0 group-hover:opacity-100"
            onClick={() => {
              resetDraft();
              setSelectedParticipants([]);
              setTopic('');
              editorRef.current?.clearContent();
              setEditorText(emptyTiptapEditorContent);
              removeAllAttachments();
            }}>
            Clear Draft
          </Button>
        )}

        <Editor
          initialValue={editorText}
          onChange={setEditorText}
          canUpload={canUpload}
          ref={editorRef}
        />

        <AttachmentArray attachments={attachments} />
        <div className="flex flex-row items-center justify-between gap-2">
          <div className="flex min-w-0 flex-row items-center gap-2">
            {!emailIdentitiesLoading && hasExternalParticipants ? (
              <div className="flex min-w-0 items-center justify-start gap-1">
                <span className="text-gray-9 px-2 text-sm">From:</span>
                <Select
                  value={selectedEmailIdentity ?? undefined}
                  onValueChange={(email) => {
                    if (
                      userEmailIdentities?.emailIdentities.find(
                        (e) => e.publicId === email
                      )?.sendingEnabled === false
                    ) {
                      return;
                    }
                    setSelectedEmailIdentity(
                      email as TypeId<'emailIdentities'>
                    );
                  }}>
                  <SelectTrigger
                    size="sm"
                    className="min-w-5">
                    <SelectValue placeholder="Select an email address" />
                  </SelectTrigger>
                  <SelectContent>
                    {userEmailIdentities?.emailIdentities.map((email) => (
                      <SelectItem
                        key={email.publicId}
                        value={email.publicId}
                        className="[&>span:last-child]:w-full">
                        <span
                          className={cn(
                            'flex !min-w-0 items-center justify-between',
                            !email.sendingEnabled && 'text-base-11'
                          )}>
                          <span className="truncate">
                            {`${email.sendName} (${email.username}@${email.domainName})`}
                          </span>
                          {!email.sendingEnabled && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Question size={14} />
                              </TooltipTrigger>
                              <TooltipContent className="flex flex-col">
                                <span>
                                  Sending from this email identity is disabled.
                                </span>
                                <span>
                                  {isAdmin
                                    ? 'Please check that the DNS records are correctly set up.'
                                    : 'Please contact your admin for assistance.'}
                                </span>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
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
              loading={isCreating && messageType === 'comment'}
              disabled={!isFormValid || isCreating}
              onClick={() => createConvo('comment')}>
              {isMobile ? <ChatTeardropText size={16} /> : <span>Comment</span>}
            </Button>
            <Button
              size={'sm'}
              loading={isCreating && messageType === 'message'}
              disabled={!isFormValid || isCreating}
              onClick={() => createConvo('message')}>
              {isMobile ? <PaperPlaneTilt size={16} /> : <span>Send</span>}
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
  selectedParticipants: NewConvoParticipant[];
  setSelectedParticipants: Dispatch<SetStateAction<NewConvoParticipant[]>>;
  setNewEmailParticipants: Dispatch<SetStateAction<string[]>>;
};

function ParticipantsComboboxPopover({
  participants,
  loading,
  selectedParticipants,
  setSelectedParticipants,
  setNewEmailParticipants
}: ParticipantsComboboxPopoverProps) {
  const [open, setOpen] = useState(false);
  const [currentSelectValue, setCurrentSelectValue] = useState('');
  const [search, setSearch] = useState('');
  const hasExternalParticipants = useMemo(
    () =>
      selectedParticipants.some(
        (participant) =>
          participant.type === 'email' || participant.type === 'contact'
      ),
    [selectedParticipants]
  );

  const addEmailParticipant = (email: string) => {
    setNewEmailParticipants((prev) =>
      prev.includes(email) ? prev : prev.concat(email)
    );
    setSelectedParticipants((prev) =>
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
              <div className="flex flex-wrap gap-2 overflow-hidden">
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
                        <p className="text-base-11 text-sm">
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
                label="Search or type an Email address"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  // Hack to prevent cmdk from preventing Home and End keys
                  if (e.key === 'Home' || e.key === 'End') {
                    e.stopPropagation();
                  }
                  if (e.key === 'Enter') {
                    if (z.string().email().safeParse(search).success) {
                      addEmailParticipant(search);
                      setCurrentSelectValue('');
                      setSearch('');
                    }
                  }
                }}
                onFocus={() => {
                  // Remove current select value when input is focused
                  setCurrentSelectValue('');
                }}
              />
            </CommandInput>
            <CommandList className="max-h-[calc(var(--radix-popover-content-available-height)*0.9)] overflow-x-clip overflow-y-scroll">
              {loading && <CommandLoading>Loading Participants</CommandLoading>}
              <CommandGroup className="flex flex-col gap-2 px-1">
                {!loading && (
                  <EmptyStateHandler
                    addSelectedParticipant={setSelectedParticipants}
                    setEmailParticipants={setNewEmailParticipants}
                  />
                )}
                {participants.map((participant) => (
                  <CommandItem
                    key={participant.publicId}
                    value={participant.publicId}
                    keywords={participant.keywords}
                    onSelect={(value) => {
                      if (participant.own) return;
                      setSelectedParticipants((prev) =>
                        prev.find((p) => p.publicId === value)
                          ? prev.filter((p) => p.publicId !== value)
                          : prev.concat(participant)
                      );
                    }}>
                    <HoverCard>
                      <Button
                        variant={'ghost'}
                        className={cn(
                          'my-1 w-full items-center justify-start gap-2 px-1',
                          selectedParticipants.find(
                            (p) => p.publicId === participant.publicId
                          )
                            ? 'text-gray-10'
                            : 'text-base-11'
                        )}
                        disabled={
                          participant.type === 'orgMember' &&
                          participant.disabled
                        }
                        onFocus={() =>
                          setCurrentSelectValue(participant.publicId)
                        }>
                        <div className="flex items-center justify-center gap-2">
                          <HoverCardTrigger className="flex flex-row items-center gap-1">
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
                            <p className="text-base-11 text-sm">
                              {participant.own && participant.own
                                ? 'You (already a participant)'
                                : `${participant.name} ${participant.title ? `(${participant.title})` : ''}`}
                            </p>
                          </HoverCardTrigger>
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
                      {participant.address && participant.name && (
                        <HoverCardContent className="bg-slate-6 flex min-w-[280px] flex-col gap-1">
                          <span className="font-100 text-xs">
                            <span className="font-medium">Name :</span>{' '}
                            {participant.name}
                          </span>
                          {!participant.handle ||
                            (participant.handle !== '' && (
                              <span className="font-100 text-xs">
                                <span className="font-medium">Handle :</span>{' '}
                                {participant.handle}
                              </span>
                            ))}
                          {!participant.address ||
                            (participant.address !== '' && (
                              <span className="font-100 text-xs">
                                <span className="font-medium">Address :</span>{' '}
                                {participant.address}
                              </span>
                            ))}
                        </HoverCardContent>
                      )}
                    </HoverCard>
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

type EmptyStateHandlerProps = {
  setEmailParticipants: Dispatch<SetStateAction<string[]>>;
  addSelectedParticipant: Dispatch<SetStateAction<NewConvoParticipant[]>>;
};

function EmptyStateHandler({
  setEmailParticipants,
  addSelectedParticipant
}: EmptyStateHandlerProps) {
  const isEmpty = useCommandState((state) => state.filtered.count === 0);
  const email = useCommandState((state) => state.search);
  const isValidEmail = useMemo(
    () => z.string().email().safeParse(email).success,
    [email]
  );

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
