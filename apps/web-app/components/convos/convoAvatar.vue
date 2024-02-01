<script setup lang="ts">
  import type { ConvoParticipantEntry } from '~/composables/types';
  type Props = {
    participant: ConvoParticipantEntry;
    size?: 'xs' | 'sm' | 'md' | 'lg';
  };

  const props = defineProps<Props>();
</script>
<template>
  <UnUiAvatar
    v-if="props.participant"
    :avatar-id="props.participant.avatarPublicId"
    :public-id="props.participant.avatarPublicId"
    :alt="props.participant.name"
    :type="props.participant.type"
    :color="props.participant.color"
    :show-icon="true"
    :size="props.size ? props.size : 'sm'" />
</template>
