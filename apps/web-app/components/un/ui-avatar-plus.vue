<script setup lang="ts">
  import type { VariantProps } from 'class-variance-authority';
  import {
    TooltipArrow,
    TooltipContent,
    TooltipProvider,
    TooltipRoot,
    TooltipTrigger
  } from 'radix-vue';

  type AuthorEntry = {
    avatarId: string;
    name: string;
    type: string;
    color: string;
  };
  type Props = {
    primary: AuthorEntry;
    avatars: AuthorEntry[];
    size: 'tiny' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    limit?: number;
  };

  const props = withDefaults(defineProps<Props>(), {
    size: 'md',
    limit: 1
  });

  const avatarClasses = useUtils().cva('', {
    variants: {
      primaryImage: {
        tiny: '32x32',
        xs: '32x32',
        sm: '48x48',
        md: '56x56',
        lg: '64x64',
        xl: '80x80',
        '2xl': '128x128'
      },
      plusImage: {
        tiny: '16x16',
        xs: '16x16',
        sm: '24x24',
        md: '28x28',
        lg: '32x32',
        xl: '40x40',
        '2xl': '64x64'
      },
      primaryContainer: {
        tiny: 'w-[16px] h-[16px] text-xs rounded-md',
        xs: 'w-[32px] h-[32px] text-sm rounded-md',
        sm: 'w-[48px] h-[48px] text-base rounded-md',
        md: 'w-[56px] h-[56px] text-lg rounded-lg',
        lg: 'w-[64px] h-[64px] text-xl rounded-lg',
        xl: 'w-[80px] h-[80px] text-2xl rounded-lg',
        '2xl': 'w-[128px] h-[128px] text-3xl rounded-xl'
      },
      plusContainer: {
        tiny: 'w-[16px] h-[16px] text-xs',
        xs: 'w-[32px] h-[32px] text-sm',
        sm: 'w-[48px] h-[48px] text-base',
        md: 'w-[56px] h-[56px] text-lg',
        lg: 'w-[64px] h-[64px] text-xl',
        xl: 'w-[80px] h-[80px] text-2xl',
        '2xl': 'w-[128px] h-[128px] text-3xl'
      },
      color: {
        base: 'bg-base-3',
        red: 'bg-red-9',
        purple: 'bg-purple-9',
        green: 'bg-green-9',
        yellow: 'bg-yellow-9',
        pink: 'bg-pink-9',
        blue: 'bg-blue-9'
      }
    }
  });

  const expanded = ref(false);
  const toggleState = ref(false);
  const imageUrlAccountHash = useRuntimeConfig().public.cfImagesAccountHash;

  const avatarArray = computed(() => {
    if (props.avatars.length + 1 > props.limit) {
      return props.avatars.slice(0, props.limit - 1);
    }
    return props.avatars;
  });
</script>
<template>
  <div class="">
    <UnUiTooltip :text="primary.name || ''">
      <div
        class="bg-cover bg-center font-display flex justify-center items-center"
        :class="
          avatarClasses({ primaryContainer: props.size, color: primary.color })
        "
        :style="
          primary.avatarId
            ? `background-image: url(https://imagedelivery.net/${imageUrlAccountHash}/${
                primary.avatarId
              }/${avatarClasses({ primaryImage: props.size })})`
            : ''
        ">
        {{
          primary.avatarId ? '' : primary.name ? primary.name?.charAt(0) : ''
        }}
      </div>
    </UnUiTooltip>

    <TooltipProvider v-if="props.avatars.length + 1 > props.limit">
      <TooltipRoot v-model:open="toggleState">
        <TooltipTrigger
          @click="toggleState = !toggleState"
          class="relative -top-[25px] w-fit -right-[35px] -mb[25px]">
          <div
            class="rounded-2 font-display text-base-12 flex justify-center items-center backdrop-blur-2xl w-[32px] h-[32px] text-sm shadow">
            + {{ props.avatars.length - props.limit + 1 }}
          </div>
        </TooltipTrigger>
        <Teleport to="body">
          <TooltipContent
            :side-offset="5"
            :avoid-collisions="true"
            class="data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade max-w-80 border border-base-6 rounded-lg bg-base-2 p-4 text-sm">
            <div class="flex flex-row gap-2">
              <div
                v-for="avatar in props.avatars"
                :key="avatar.avatarId">
                <UnUiAvatar
                  :avatar-id="avatar.avatarId"
                  :name="avatar.name"
                  :tooltip-pre-text="avatar.type"
                  :color="avatar.color"
                  size="sm" />
              </div>
              <TooltipArrow class="fill-base-11" />
            </div>
          </TooltipContent>
        </Teleport>
      </TooltipRoot>
    </TooltipProvider>
  </div>
</template>
