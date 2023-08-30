<script setup lang="ts">
  import { z } from 'zod';
  const { $trpc, $i18n } = useNuxtApp();
  definePageMeta({ auth: false });

  const buttonLoading = ref(false);

  //Form Fields
  const usernameValid = ref<boolean | null>(null);
  const usernameValue = ref('');
  const nameValid = ref<boolean | null>(null);
  const nameValue = ref('');
  const orgNameValid = ref<boolean | null>(null);
  const orgNameDefaultValue = ref('');
  const orgNameValue = ref('');

  const formValid = computed(() => {
    return usernameValid.value && nameValid.value && orgNameValid.value;
  });

  watchDebounced(
    nameValue,
    async () => {
      if (!orgNameValue.value) {
        orgNameDefaultValue.value = nameValue.value + "'s Organization";
        orgNameValue.value = orgNameDefaultValue.value;
      }
      if (orgNameValue.value === orgNameDefaultValue.value) {
        orgNameDefaultValue.value = nameValue.value + "'s Organization";
        orgNameValue.value = orgNameDefaultValue.value;
      }
    },
    { debounce: 250, maxWait: 5000 }
  );
</script>

<template>
  <div class="flex flex-col gap-4 p-4">
    <div class="text-5xl font-display text-base-12 opacity-90">UnInbox</div>
    <UnUiInput
      v-model:value="usernameValue"
      v-model:valid="usernameValid"
      icon="ph:at"
      label="Username"
      helper="This will be your username across the Un ecosystem. It must be unique and can only contain letters and numbers. Usernames less than 5 characters long are available for premium users, 3 or less characters are reserved for lifetime license users."
      placeholder="Enter a cool username"
      :schema="
        z
          .string()
          .min(5, { message: 'Must be at least 5 characters long' })
          .max(32, {
            message: '😂 Too Long, Aint nobody typing that. Be serious, please!'
          })
          .regex(/^[a-zA-Z0-9]*$/, {
            message: 'Only letters and numbers'
          })
      " />
    <UnUiInput
      v-model:value="nameValue"
      v-model:valid="nameValid"
      icon="ph:user"
      label="Your Name"
      helper="This is is the name that will be shown when you send messages and when people within your organization search for you."
      placeholder="Joe Bloggs"
      :schema="
        z.string().min(2, { message: 'Must be at least 2 characters long' })
      " />
    <UnUiInput
      v-model:value="orgNameValue"
      v-model:valid="orgNameValid"
      icon="ph:house"
      label="Organization Name"
      helper="An organization is a group of people that you can collaborate and share messages with. You can create an organization for your company, your family, your friends, or any other group of people you want to communicate with."
      placeholder="Un Inc"
      locked
      :schema="
        z.string().min(2, { message: 'Must be at least 2 characters long' })
      " />

    <UnUiButton
      label="Hello World"
      icon="ph:password"
      :loading="buttonLoading"
      :disabled="!formValid"
      size="sm"
      width="full"
      @click="console.log('button clicked')" />
  </div>
</template>
