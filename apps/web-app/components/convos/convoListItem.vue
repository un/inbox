<script setup lang="ts">
  import { useTimeAgo } from '@vueuse/core';
  import { string } from 'zod';
  import type { ConvoParticipantEntry } from '~/composables/types';
  const { $trpc } = useNuxtApp();

  type PromiseType<T> = T extends Promise<infer U> ? U : never;
  type UserConvosDataType = PromiseType<
    ReturnType<typeof $trpc.convos.getUserConvos.query>
  >['data'];

  type Props = {
    convo: UserConvosDataType[number];
  };
  const props = defineProps<Props>();

  const timeAgo = useTimeAgo(props.convo.lastUpdatedAt || new Date());

  const participantArray = ref<ConvoParticipantEntry[]>([]);
  const author = ref<ConvoParticipantEntry>();
  const authorEntryPublicId = computed(() => {
    const entryAuthor = props.convo.entries[0].author;
    return (
      entryAuthor.orgMember?.publicId ||
      entryAuthor.userGroup?.publicId ||
      entryAuthor.contact?.publicId
    );
  });
  const authorEntryName = computed(() => {
    const entryAuthor = props.convo.entries[0].author;
    return (
      entryAuthor.userGroup?.publicId ||
      entryAuthor.contact?.publicId ||
      entryAuthor.orgMember?.profile.firstName +
        ' ' +
        entryAuthor.orgMember?.profile.lastName ||
      'Participant'
    );
  });

  for (const participant of props.convo.participants) {
    const participantPublicId = participant.publicId;
    const participantTypePublicId =
      participant.contact?.publicId ||
      participant.userGroup?.publicId ||
      participant.orgMember?.publicId ||
      '';
    const avatarPublicId =
      participant.contact?.avatarId ||
      participant.userGroup?.avatarId ||
      participant.orgMember?.profile.avatarId ||
      '';
    const participantName =
      participant.contact?.name || participant.contact?.emailUsername
        ? participant.contact?.emailUsername +
          '@' +
          participant.contact?.emailDomain
        : participant.userGroup?.name ||
          participant.orgMember?.profile?.firstName +
            ' ' +
            participant.orgMember?.profile?.lastName ||
          '';
    const participantType = participant.contact?.publicId
      ? 'contact'
      : participant.userGroup?.name
        ? 'group'
        : 'user';
    const participantColor = participant.userGroup?.color || null;
    const participantData: ConvoParticipantEntry = {
      participantPublicId: participantPublicId,
      typePublicId: participantTypePublicId,
      avatarPublicId: avatarPublicId,
      name: participantName,
      type: participantType,
      role: participant.role,
      color: participantColor
    };
    if (participantTypePublicId === authorEntryPublicId.value) {
      author.value = participantData;
    } else {
      participantArray.value.push(participantData);
    }
    console.log('avatar data', {
      avatarPublicId,
      contact: participant.contact?.publicId,
      group: participant.userGroup?.publicId,
      user: participant.orgMember?.profile.publicId
    });
  }
</script>
<template>
  <button
    class="bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 max-w-full flex flex-col justify-between gap-0 rounded-lg">
    <div class="h-fit w-full flex flex-row items-center gap-6">
      <UnUiAvatarPlus
        :avatars="participantArray"
        :primary="author"
        size="lg" />
      <div class="w-full flex flex-col gap-1 overflow-hidden">
        <!-- <div class="text-base text-left w-full overflow-hidden text-sm">
          <span class="line-clamp-2 font-bold">{{ authorName }}</span>
        </div> -->
        <div class="w-full overflow-hidden text-left text-xs">
          <span class="truncate text-xs font-italic">
            Re: {{ props.convo.subjects[0].subject }}
          </span>
        </div>
        <div class="w-full overflow-hidden text-left text-base text-sm">
          <span class="line-clamp-2">
            <span class="font-bold">{{ authorEntryName }} </span>
            : {{ props.convo.entries[0].bodyPlainText }}
          </span>
        </div>
      </div>
    </div>
    <div class="w-full flex flex-row items-center justify-end gap-1">
      <div class="min-w-fit overflow-hidden text-right text-xs text-base-11">
        <span class="">{{ timeAgo }}</span>
      </div>
    </div>
  </button>
</template>
