<script setup lang="ts">
  import type { ConvoParticipantEntry } from '~/composables/types';
  type Props = {
    participantPublicId: string;
    participants: ConvoParticipantEntry[];
    size?: 'xs' | 'sm' | 'md' | 'lg';
  };

  const props = defineProps<Props>();
  const participant = computed(() => {
    return props.participants.find(
      (participant) =>
        participant.participantPublicId === props.participantPublicId
    );
  });
</script>
<template>
  <UnUiAvatar
    v-if="participant"
    :avatar-id="participant.avatarPublicId"
    :public-id="participant.avatarPublicId"
    :alt="participant.name"
    :type="participant.type"
    :color="participant.color"
    :show-icon="true"
    :size="props.size ? props.size : 'sm'" />
</template>
