<script lang="ts">
  import type { DefineComponent } from 'vue';
  import { NuxtUiAvatar } from '#components';

  export default defineComponent<
    typeof NuxtUiAvatar extends DefineComponent<infer Props, any, any>
      ? Props & {
          color?: string;
          publicId: string;
          type: 'user' | 'org' | 'group' | 'contact';
          avatarUrl?: string | undefined;
        }
      : never
  >({
    props: {
      ...NuxtUiAvatar.props,
      color: {
        type: String,
        required: false,
        default: null
      },
      publicId: {
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
      }
    },
    setup(props: any) {
      const avatarUrl = computed(() => {
        const size: string = props.size;
        return props.src
          ? props.src
          : props.publicId
            ? //@ts-ignore
              useUtils().generateAvatarUrl(props.type, props.publicId, size)
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
        placeholder: 'font-display text-gray-950 dark:text-gray-800'
      }"
      :class="
        $props.color
          ? `bg-${$props.color}-400 dark:bg-${$props.color}-300`
          : `bg-gray-400 dark:bg-gray-300`
      " />
  </UnUiTooltip>
</template>
