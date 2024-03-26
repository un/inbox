<script setup lang="ts">
  import { OTPInput } from 'vue-input-otp';
  import Slot from '../settings/otpSlot.vue';
  import { useVModel } from '@vueuse/core';

  const props = defineProps<{
    modelValue: string;
  }>();

  const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
  }>();

  const optInput = useVModel(props, 'modelValue', emit);
</script>
<template>
  <div>
    <OTPInput
      v-slot="{ slots }"
      v-model="optInput"
      :maxlength="6"
      container-class="group flex items-center has-[:disabled]:opacity-30">
      <div class="flex">
        <Slot
          v-for="(slot, idx) in slots.slice(0, 3)"
          v-bind="slot"
          :key="idx" />
      </div>
      <!-- Fake Dash. Inspired by Stripe's MFA input. -->
      <div class="flex w-10 items-center justify-center">
        <div class="bg-base-9 h-1 w-3 rounded-full" />
      </div>
      <div class="flex">
        <Slot
          v-for="(slot, idx) in slots.slice(3)"
          v-bind="slot"
          :key="idx" />
      </div>
    </OTPInput>
  </div>
</template>
