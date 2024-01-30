<script setup lang="ts">
  import type { UiColor } from '@uninbox/types/ui';
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
    // if (props.avatars.length + 1 > props.limit) {
    //   return props.avatars.slice(0, props.limit - 1);
    // }
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
  <div class="h-fit flex flex-row items-end">
    <UnUiAvatar
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
        class="bg-gray-50 h-[32px] w-[32px] flex items-center justify-center rounded-2 text-sm font-display shadow backdrop-blur-2xl">
        + {{ props.avatars.length - props.limit + 1 }}
      </div>

      <template #panel>
        <div class="flex flex-row gap-2 p-4">
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
