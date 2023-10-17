<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { z } from 'zod';
  import { useClipboard } from '@vueuse/core';

  const { copy, copied, text } = useClipboard();
  const { $trpc, $i18n } = useNuxtApp();

  const newButtonLoading = ref(false);
  const newButtonLabel = ref('Make my organization');
  const pageError = ref(false);

  //Form Fields
  const orgNameValid = ref<boolean | 'remote' | null>(null);
  const orgNameValue = ref('');
  const orgNameValidationMessage = ref('');

  const formValid = computed(() => {
    return orgNameValid.value;
  });

  //functions
  async function createNewOrg() {
    newButtonLoading.value = true;

    newButtonLabel.value = 'Creating your organization';
    const createNewOrgResponse = await $trpc.org.crud.createNewOrg.mutate({
      orgName: orgNameValue.value
    });
    if (!createNewOrgResponse.success) {
      newButtonLoading.value = false;
      pageError.value = true;
      newButtonLabel.value = 'Something went wrong!';
    }
    newButtonLoading.value = false;
    newButtonLabel.value = 'All Done!';
    refreshNuxtData('getUserOrgsSidebar');
    navigateTo(`/settings/org/${createNewOrgResponse.orgId}`);
  }
</script>

<template>
  <div class="h-full w-full flex flex-col items-start gap-8 p-4">
    <div class="w-full flex flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-2xl font-display">Create a new organization</span>
        </div>
      </div>
    </div>
    <div class="w-full flex flex-col gap-4">
      <UnUiInput
        v-model:value="orgNameValue"
        v-model:valid="orgNameValid"
        v-model:validationMessage="orgNameValidationMessage"
        label="Organization Name"
        placeholder=""
        :schema="z.string()" />

      <UnUiButton
        :label="newButtonLabel"
        icon="ph-house"
        :loading="newButtonLoading"
        :disabled="!formValid"
        @click="createNewOrg()" />
    </div>
  </div>
</template>
