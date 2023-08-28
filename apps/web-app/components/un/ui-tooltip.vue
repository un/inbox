<script setup lang="ts">
  import {
    TooltipArrow,
    TooltipContent,
    TooltipRoot,
    TooltipTrigger
  } from 'radix-vue';

  const toggleState = ref(false);

  defineProps({
    text: { type: String, required: true }
  });
</script>
<template>
  <TooltipRoot v-model:open="toggleState">
    <TooltipTrigger class="">
      <slot />
    </TooltipTrigger>
    <Teleport to="body">
      <TooltipContent
        :side-offset="5"
        :collision-padding="32"
        :avoid-collisions="true"
        class="data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade max-w-80 border border-base-6 rounded bg-base-2 px-4 py-2 text-sm">
        <div>
          {{ text }}
          <TooltipArrow class="fill-base-11" />
        </div>
      </TooltipContent>
    </Teleport>
  </TooltipRoot>
</template>
