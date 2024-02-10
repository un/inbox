<script setup lang="ts">
  import type { DefineComponent } from 'vue';
  import { NuxtUiAvatar } from '#components';
  import { uiColors } from '@uninbox/types/ui';

  type UiColors = (typeof uiColors)[number] | null;

  type AvatarSize = InstanceType<typeof NuxtUiAvatar>['$props']['size'];

  type Props = {
    color?: UiColors;
    avatarId: string | null;
    name?: string;
    alt?: string;
    type: 'user' | 'org' | 'group' | 'contact';
    tooltip?: string;
    avatarUrl?: string;
    tooltipText?: string;
    showIcon?: boolean;
    tooltipIcon?: string;
    size?: AvatarSize;
  };

  const props = defineProps<Props>();

  const size = computed(() => {
    return props.size || 'sm';
  });

  const colorClass = computed(() => {
    switch (props.color) {
      case 'red':
        return 'bg-red-400 dark:bg-red-400';
      case 'orange':
        return 'bg-orange-400 dark:bg-orange-400';
      case 'amber':
        return 'bg-amber-400 dark:bg-amber-400';
      case 'yellow':
        return 'bg-yellow-400 dark:bg-yellow-400';
      case 'lime':
        return 'bg-lime-400 dark:bg-lime-400';
      case 'green':
        return 'bg-green-400 dark:bg-green-400';
      case 'emerald':
        return 'bg-emerald-400 dark:bg-emerald-400';
      case 'teal':
        return 'bg-teal-400 dark:bg-teal-400';
      case 'cyan':
        return 'bg-cyan-400 dark:bg-cyan-400';
      case 'sky':
        return 'bg-sky-400 dark:bg-sky-400';
      case 'blue':
        return 'bg-blue-400 dark:bg-blue-400';
      case 'indigo':
        return 'bg-indigo-400 dark:bg-indigo-400';
      case 'violet':
        return 'bg-violet-400 dark:bg-violet-400';
      case 'purple':
        return 'bg-purple-400 dark:bg-purple-400';
      case 'fuchsia':
        return 'bg-fuchsia-400 dark:bg-fuchsia-400';
      case 'pink':
        return 'bg-pink-400 dark:bg-pink-400';
      case 'rose':
        return 'bg-rose-400 dark:bg-rose-400';
      default:
        return 'bg-gray-400 dark:bg-gray-400';
    }
  });

  const altText = computed(() => {
    return props.name || props.alt || '';
  });

  const avatarUrl = computed(() => {
    return props.avatarUrl
      ? props.avatarUrl
      : props.avatarId
        ? useUtils().generateAvatarUrl(props.type, props.avatarId, size.value)
        : undefined;
  });

  const tooltipText = computed(() => {
    return props.tooltip ? props.tooltip : altText.value;
  });

  const tooltipIcon = computed(() => {
    switch (props.type) {
      case 'user':
        return 'i-ph-user';
      case 'org':
        return 'i-ph-buildings';
      case 'group':
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
      :alt="altText"
      :src="avatarUrl"
      :ui="{
        text: 'font-display text-white dark:text-gray-900',
        placeholder: 'font-display text-white dark:text-gray-900'
      }"
      :class="colorClass" />
  </UnUiTooltip>
</template>
