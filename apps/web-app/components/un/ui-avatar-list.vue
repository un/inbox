<script setup lang="ts">
  import type { AvatarSize } from '@nuxt/ui/dist/runtime/types/avatar';
  import type { VariantProps } from 'class-variance-authority';
  import {
    TooltipArrow,
    TooltipContent,
    TooltipProvider,
    TooltipRoot,
    TooltipTrigger
  } from 'radix-vue';

  type AuthorEntry = {
    publicId: string;
    name: string;
    type: 'user' | 'org' | 'group' | 'contact';
    color: string;
  };
  type Props = {
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
      image: {
        tiny: '32x32',
        xs: '32x32',
        sm: '48x48',
        md: '56x56',
        lg: '64x64',
        xl: '80x80',
        '2xl': '128x128'
      },
      container: {
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

  const avatarArray = computed(() => {
    if (props.avatars.length + 1 > props.limit) {
      return props.avatars.slice(0, props.limit - 1);
    }
    return props.avatars;
  });
</script>
<template>
  <div class="flex flex-row gap-2">
    <div
      v-for="avatar in avatarArray"
      :key="avatar.publicId">
      <UnUiAvatar
        :public-id="avatar.publicId"
        :name="avatar.name"
        :type="avatar.type"
        :size="props.size as AvatarSize"
        :color="avatar.color" />
    </div>

    <TooltipProvider v-if="props.avatars.length + 1 > props.limit">
      <TooltipRoot v-model:open="toggleState">
        <TooltipTrigger @click="toggleState = !toggleState">
          <div
            class="flex items-center justify-center rounded-2 bg-base-5 bg-cover bg-center text-base-12 font-display"
            :class="avatarClasses({ container: props.size })">
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
                :key="avatar.publicId">
                <UnUiAvatar
                  :public-id="avatar.publicId"
                  :name="avatar.name"
                  :type="avatar.type"
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
