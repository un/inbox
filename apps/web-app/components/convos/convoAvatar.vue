<script setup lang="ts">
  import type { ConvoParticipantEntry } from '~/composables/types';
  type Props = {
    participant: ConvoParticipantEntry;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    ring?: boolean;
  };

  const props = defineProps<Props>();
</script>
<template>
  <UnUiAvatar
    v-if="props.participant"
    :public-id="props.participant.avatarProfilePublicId"
    :avatar-timestamp="props.participant.avatarTimestamp"
    :alt="props.participant.name"
    :type="props.participant.type"
    :color="props.participant.color"
    :show-icon="true"
    :ring="props.ring"
    :size="props.size ? props.size : 'sm'" />
</template>
