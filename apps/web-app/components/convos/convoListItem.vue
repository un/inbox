<script setup lang="ts">
  import { useTimeAgo } from '@vueuse/core';
  import type {
    ConvoParticipantEntry,
    UserConvosDataType
  } from '~/composables/types';
  import { computed, ref } from '#imports';
  import { useUtils } from '~/composables/utils';

  type Props = {
    convo: UserConvosDataType[number];
  };
  const props = defineProps<Props>();

  const lastUpdatedAt = computed(() => {
    return props.convo.lastUpdatedAt || new Date();
  });

  const timeAgo = useTimeAgo(lastUpdatedAt);

  const participantArray = ref<ConvoParticipantEntry[]>([]);
  const author = ref<ConvoParticipantEntry>();
  const firstEntryAuthor =
    props.convo.entries[0]?.author || props.convo.participants[0];
  const authorEntryPublicId = computed(() => {
    if (!firstEntryAuthor) return null;
    return (
      firstEntryAuthor.orgMember?.publicId ||
      firstEntryAuthor.group?.publicId ||
      firstEntryAuthor.contact?.publicId
    );
  });
  const authorEntryName = computed(() => {
    if (!firstEntryAuthor) return null;
    return (
      firstEntryAuthor.group?.name ||
      firstEntryAuthor.contact?.setName ||
      firstEntryAuthor.contact?.name ||
      firstEntryAuthor.orgMember?.profile.firstName +
        ' ' +
        firstEntryAuthor.orgMember?.profile.lastName ||
      'Participant'
    );
  });

  for (const participant of props.convo.participants) {
    const participantData = useUtils().convos.useParticipantData(participant);
    if (!participantData) continue;
    if (participantData?.typePublicId === authorEntryPublicId.value) {
      author.value = participantData;
    } else {
      participantArray.value.push(participantData);
    }
  }
</script>
<template>
  <button
    class="flex w-full max-w-full flex-col justify-between gap-0 rounded-lg">
    <div class="flex h-fit w-full flex-row items-start gap-4">
      <UnUiAvatarPlus
        :avatars="participantArray"
        :primary="author"
        size="lg" />
      <div class="flex w-full flex-col gap-1 overflow-hidden">
        <!-- <div class="text-base text-left w-full overflow-hidden text-sm">
          <span class="line-clamp-2 font-bold">{{ authorName }}</span>
        </div> -->
        <div class="text-base-11 w-full overflow-hidden pl-2 text-left text-xs">
          <span class="font-italic truncate text-xs">
            {{ props.convo.subjects[0]?.subject }}
          </span>
        </div>
        <div
          class="bg-base-3 hover:bg-base-4 text-base-12 w-full overflow-hidden rounded-lg p-2 text-left text-sm">
          <span class="line-clamp-2">
            <span class="font-bold">{{ authorEntryName }} </span>
            : {{ props.convo.entries[0]?.bodyPlainText ?? '' }}
          </span>
        </div>
        <div class="mt-1 flex w-full flex-row items-center justify-end gap-1">
          <div
            class="text-base-11 min-w-fit overflow-hidden text-right text-xs">
            <span class="">{{ timeAgo }}</span>
          </div>
        </div>
      </div>
    </div>
  </button>
</template>
