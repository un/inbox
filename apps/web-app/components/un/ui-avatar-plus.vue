<script setup lang="ts">
  import { computed } from '#imports';
  import type { ConvoParticipantEntry } from '~/composables/types';

  type Props = {
    primary: ConvoParticipantEntry | undefined;
    avatars: ConvoParticipantEntry[];
    size: 'tiny' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    limit?: number;
  };

  const props = withDefaults(defineProps<Props>(), {
    size: 'md',
    limit: 1
  });

  const avatarArray = computed(() => {
    return props.avatars;
  });

  const primaryAvatar = computed(() => {
    if (props.primary) {
      return props.primary;
    }
    return props.avatars[0];
  });
</script>
<template>
  <div class="z-20 flex h-fit flex-row items-end">
    <UnUiAvatar
      v-if="primaryAvatar"
      :avatar-id="primaryAvatar.avatarPublicId"
      :public-id="primaryAvatar.participantPublicId"
      :alt="primaryAvatar.name"
      :type="primaryAvatar.type"
      :color="primaryAvatar.color"
      size="lg" />
    <NuxtUiPopover
      v-if="props.avatars.length + 1 > props.limit"
      class="-mb-4 -ml-4"
      :popper="{ placement: 'right' }"
      mode="hover">
      <div
        class="rounded-2 font-display bg-base-3 flex h-[32px] w-[32px] items-center justify-center text-sm shadow backdrop-blur-2xl">
        + {{ props.avatars.length - props.limit + 1 }}
      </div>

      <template #panel>
        <div class="z-50 flex flex-row gap-2 p-4">
          <div
            v-for="avatar in avatarArray"
            :key="avatar.participantPublicId">
            <UnUiAvatar
              :avatar-id="avatar.avatarPublicId"
              :public-id="avatar.participantPublicId"
              :alt="avatar.name"
              :type="avatar.type"
              :color="avatar.color"
              size="lg" />
          </div>
        </div>
      </template>
    </NuxtUiPopover>
  </div>
</template>
