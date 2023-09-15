<script setup lang="ts">
  import {
    TooltipArrow,
    TooltipContent,
    TooltipProvider,
    TooltipRoot,
    TooltipTrigger
  } from 'radix-vue';

  const toggleState = ref(false);

  defineProps({
    text: { type: String, required: true },
    parentClass: { type: String, required: false }

    //TODO: fix: tooltip trigger requires clicking twice to open
  });
</script>
<template>
  <TooltipProvider v-if="text">
    <TooltipRoot v-model:open="toggleState">
      <TooltipTrigger
        :class="parentClass"
        @click="toggleState = !toggleState">
        <slot />
      </TooltipTrigger>
      <Teleport to="body">
        <TooltipContent
          :side-offset="5"
          :collision-padding="32"
          :avoid-collisions="true"
          class="data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade max-w-80 border border-2 border-base-6 rounded-2 bg-base-1 px-4 py-2 text-sm text-base-12 drop-shadow">
          <div>
            {{ text }}
            <TooltipArrow class="fill-base-11" />
          </div>
        </TooltipContent>
      </Teleport>
    </TooltipRoot>
  </TooltipProvider>
  <slot v-if="!text || text === ''" />
</template>
