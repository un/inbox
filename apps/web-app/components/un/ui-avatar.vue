<script lang="ts">
  import type { DefineComponent } from 'vue';
  import { NuxtUiAvatar } from '#components';

  export default defineComponent<
    typeof NuxtUiAvatar extends DefineComponent<infer Props, any, any>
      ? Props & {
          color?: string;
          avatarId?: string;
          avatarUrl?: string | undefined;
        }
      : never
  >({
    props: {
      ...NuxtUiAvatar.props,
      color: {
        type: String,
        required: false,
        default: 'red'
      },
      avatarId: {
        type: String,
        required: false,
        default: null
      }
    },
    setup(props: any) {
      const avatarUrl = computed(() => {
        const size: string = props.size;
        return props.src
          ? props.src
          : props.avatarId
            ? useUtils().generateAvatarUrl(props.avatarId, size)
            : null;
      });

      return { avatarUrl };
    }
  });
  //TODO: Ensure that the color prop is a pre-defined color so tailwindcss correctly generates it for the css
</script>
<template>
  <UnUiTooltip :text="$props.alt">
    <NuxtUiAvatar
      v-bind="$props"
      :src="avatarUrl"
      :ui="{
        text: 'font-display text-gray-950',
        placeholder: 'font-display text-gray-950'
      }"
      :class="`bg-${$props.color}-400`" />
  </UnUiTooltip>
</template>
