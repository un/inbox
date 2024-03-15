<script setup lang="ts">
  import { useTimeAgo } from '@vueuse/core';
  import type {
    ConvoParticipantEntry,
    UserConvosDataType
  } from '~/composables/types';

  type Props = {
    convo: UserConvosDataType[number];
  };
  const props = defineProps<Props>();

  const timeAgo = useTimeAgo(props.convo.lastUpdatedAt || new Date());

  const participantArray = ref<ConvoParticipantEntry[]>([]);
  const author = ref<ConvoParticipantEntry>();
  const firstEntryAuthor =
    props.convo.entries[0].author || props.convo.participants[0];
  const authorEntryPublicId = computed(() => {
    return (
      firstEntryAuthor.orgMember?.publicId ||
      firstEntryAuthor.userGroup?.publicId ||
      firstEntryAuthor.contact?.publicId
    );
  });
  const authorEntryName = computed(() => {
    return (
      firstEntryAuthor.userGroup?.name ||
      firstEntryAuthor.contact?.setName ||
      firstEntryAuthor.contact?.name ||
      firstEntryAuthor.orgMember?.profile.firstName +
        ' ' +
        firstEntryAuthor.orgMember?.profile.lastName ||
      'Participant'
    );
  });

  for (const participant of props.convo.participants) {
    const {
      participantPublicId,
      participantTypePublicId,
      avatarPublicId,
      participantName,
      participantType,
      participantColor,
      participantRole
    } = useUtils().convos.useParticipantData(participant);
    const participantData: ConvoParticipantEntry = {
      participantPublicId: participantPublicId,
      typePublicId: participantTypePublicId,
      avatarPublicId: avatarPublicId,
      name: participantName,
      type: participantType,
      role: participantRole,
      color: participantColor
    };
    if (participantTypePublicId === authorEntryPublicId.value) {
      author.value = participantData;
    } else {
      participantArray.value.push(participantData);
    }
  }
</script>
<template>
  <button
    class="flex max-w-full flex-col justify-between gap-0 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800">
    <div class="flex h-fit w-full flex-row items-center gap-6">
      <UnUiAvatarPlus
        :avatars="participantArray"
        :primary="author"
        size="lg" />
      <div class="flex w-full flex-col gap-1 overflow-hidden">
        <!-- <div class="text-base text-left w-full overflow-hidden text-sm">
          <span class="line-clamp-2 font-bold">{{ authorName }}</span>
        </div> -->
        <div class="w-full overflow-hidden text-left text-xs">
          <span class="font-italic truncate text-xs">
            {{ props.convo.subjects[0].subject }}
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
    <div class="flex w-full flex-row items-center justify-end gap-1">
      <div class="text-base-11 min-w-fit overflow-hidden text-right text-xs">
        <span class="">{{ timeAgo }}</span>
      </div>
    </div>
  </button>
</template>
