<script setup lang="ts">
  import { computed } from '#imports';
  import { useUtils } from '~/composables/utils';
  import { NuxtUiAvatar } from '#components';
  import { uiColors } from '@u22n/types/ui';
  import type { TypeId } from '@u22n/utils';

  type UiColors = (typeof uiColors)[number] | null;

  type AvatarSize = InstanceType<typeof NuxtUiAvatar>['$props']['size'];

  type Props = {
    color?: UiColors;
    publicId: TypeId<'orgMemberProfile' | 'contacts' | 'teams' | 'org'> | null;
    avatarTimestamp: Date | null;
    name?: string;
    alt?: string;
    type: 'orgMember' | 'org' | 'team' | 'contact';
    tooltip?: string;
    avatarUrl?: string;
    tooltipText?: string;
    showIcon?: boolean;
    tooltipIcon?: string;
    size?: AvatarSize;
    ring?: boolean;
  };

  const props = defineProps<Props>();

  const size = computed(() => {
    return props.size || 'sm';
  });

  const colorClass = computed(() => {
    switch (props.color) {
      case 'red':
        return 'bg-red-9 dark:bg-red-9';
      case 'orange':
        return 'bg-orange-9 dark:bg-orange-9';
      case 'amber':
        return 'bg-amber-9 dark:bg-amber-9';
      case 'yellow':
        return 'bg-yellow-9 dark:bg-yellow-9';
      case 'lime':
        return 'bg-lime-9 dark:bg-lime-9';
      case 'green':
        return 'bg-green-9 dark:bg-green-9';
      case 'emerald':
        return 'bg-emerald-9 dark:bg-emerald-9';
      case 'teal':
        return 'bg-teal-9 dark:bg-teal-9';
      case 'cyan':
        return 'bg-cyan-9 dark:bg-cyan-9';
      case 'sky':
        return 'bg-sky-9 dark:bg-sky-9';
      case 'blue':
        return 'bg-blue-9 dark:bg-blue-9';
      case 'indigo':
        return 'bg-indigo-9 dark:bg-indigo-9';
      case 'violet':
        return 'bg-violet-9 dark:bg-violet-9';
      case 'purple':
        return 'bg-purple-9 dark:bg-purple-9';
      case 'fuchsia':
        return 'bg-fuchsia-9 dark:bg-fuchsia-9';
      case 'pink':
        return 'bg-pink-9 dark:bg-pink-9';
      case 'rose':
        return 'bg-rose-9 dark:bg-rose-9';
      default:
        return 'bg-base-9 dark:bg-base-9';
    }
  });

  const classes = computed(() => {
    const ringClasses = props.ring ? 'ring-base-3 dark:ring-base-3 ring-2' : '';
    return `${ringClasses} ${colorClass.value}`;
  });

  const altText = computed(() => {
    return props.name || props.alt || '';
  });

  const avatarUrl = computed(() => {
    if (props.avatarUrl) {
      return props.avatarUrl;
    }
    if (props.avatarTimestamp && props.publicId) {
      return (
        useUtils().generateAvatarUrl({
          publicId: props.publicId,
          avatarTimestamp: props.avatarTimestamp,
          size: size.value
        }) || false
      );
    }
    return false;
  });

  const tooltipText = computed(() => {
    return props.tooltip ? props.tooltip : altText.value;
  });

  const tooltipIcon = computed(() => {
    switch (props.type) {
      case 'orgMember':
        return 'i-ph-user';
      case 'org':
        return 'i-ph-buildings';
      case 'team':
        return 'i-ph-users-three';
      case 'contact':
        return 'i-ph-at';
      default:
        return 'i-ph-user';
    }
  });

  //TODO: Ensure that the color prop is a pre-defined color so tailwindcss correctly generates it for the css
</script>
<template>
  <UnUiTooltip>
    <template #text>
      <div class="flex flex-row items-center gap-1">
        <UnUiIcon
          v-if="$props.showIcon && tooltipIcon"
          :name="tooltipIcon" />
        <span>{{ tooltipText }}</span>
      </div>
    </template>
    <NuxtUiAvatar
      :size="size"
      :alt="altText.toUpperCase()"
      :src="avatarUrl"
      :ui="{
        text: 'font-display text-white dark:text-white',
        placeholder: 'font-display text-white dark:text-white'
      }"
      :class="classes" />
  </UnUiTooltip>
</template>
