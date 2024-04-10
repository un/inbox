<script setup lang="ts">
  import { PinInputInput, PinInputRoot } from 'radix-vue';
  import { useVModel } from '@vueuse/core';

  const props = defineProps<{
    modelValue: string[];
  }>();

  const emit = defineEmits<{
    (e: 'update:modelValue', value: string[]): void;
  }>();

  const otpInput = useVModel(props, 'modelValue', emit);
</script>
<template>
  <div>
    <PinInputRoot
      id="pin-input"
      v-model="otpInput"
      :max-length="6"
      placeholder="_"
      class="mt-1 flex items-center justify-between gap-2 p-2"
      type="number">
      <PinInputInput
        v-for="(id, index) in 6"
        :key="id"
        :index="index"
        class="text-green-10 placeholder:text-mauve-6 bg-base-1 focus:outline-gray-7 border-base-7 h-9 w-9 rounded border text-center font-semibold shadow-md focus:outline focus:outline-2 focus:outline-offset-2" />
    </PinInputRoot>
  </div>
</template>
