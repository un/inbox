<script lang="ts">
  import type { DefineComponent } from 'vue';
  import { NuxtUiAvatar } from '#components';
  import { uiColors } from '@uninbox/types/ui';

  type UiColors = (typeof uiColors)[number] | null;

  export default defineComponent<
    typeof NuxtUiAvatar extends DefineComponent<infer Props, any, any>
      ? Props & {
          color?: UiColors;
          publicId: string;
          avatarId: string;
          type: 'user' | 'org' | 'group' | 'contact';
          tooltip?: string;
          avatarUrl?: string | undefined;
          tooltipText?: string | undefined;
          showIcon?: boolean | undefined;
          tooltipIcon?: string | undefined;
        }
      : never
  >({
    props: {
      ...NuxtUiAvatar.props,
      color: {
        type: uiColors || null || undefined,
        required: false,
        default: () => null
      },
      publicId: {
        type: String,
        required: false,
        default: null
      },
      avatarId: {
        type: String,
        required: false,
        default: null
      },
      type: {
        type: String,
        required: false,
        default: null,
        validator: function (value: string) {
          // It must be one of these values
          return ['user', 'org', 'group', 'contact'].includes(value);
        }
      },
      tooltip: {
        type: String,
        required: false,
        default: null
      },
      showIcon: {
        type: Boolean,
        required: false,
        default: false
      }
    },
    setup(props: any) {
      const avatarUrl = computed(() => {
        const size:
          | '3xs'
          | '2xs'
          | 'xs'
          | 'sm'
          | 'md'
          | 'lg'
          | 'xl'
          | '2xl'
          | '3xl'
          | '4xl'
          | '5xl'
          | undefined = props.size;
        return props.src
          ? props.src
          : props.avatarId
            ? useUtils().generateAvatarUrl(props.type, props.avatarId, size)
            : null;
      });
      const tooltipText = computed(() => {
        return props.tooltip ? props.tooltip : props.alt;
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

      return { avatarUrl, tooltipText, tooltipIcon };
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
      v-bind="$props"
      :src="avatarUrl"
      :ui="{
        text: 'font-display text-gray-900 dark:text-white',
        placeholder: 'font-display text-gray-600 dark:text-gray-400'
      }"
      :class="
        $props.color
          ? `bg-${$props.color}-200 dark:bg-${$props.color}-700`
          : `bg-gray-100 dark:bg-gray-800`
      " />
  </UnUiTooltip>
</template>
