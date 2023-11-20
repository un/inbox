<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { z } from 'zod';
  import { useClipboard } from '@vueuse/core';

  const { copy, copied, text } = useClipboard();
  const { $trpc, $i18n } = useNuxtApp();

  const showNewModal = ref(false);
  const buttonLoading = ref(false);
  const buttonLabel = ref('Add Domain');
  const pageError = ref(false);
  const newDomainNameValid = ref<boolean | 'remote' | null>(null);
  const newDomainNameValue = ref('');
  const newDomainNameValidationMessage = ref('');
  const newDomainResponseError = ref('');
  const newDomainPublicId = ref('');
  const formValid = computed(() => {
    return newDomainNameValid.value === true;
  });

  const orgPublicId = useRoute().params.orgId as string;

  async function createNewDomain() {
    if (newDomainNameValid.value === false) return;
    buttonLoading.value = true;
    buttonLabel.value = 'Creating domain...';
    const newDomainResponse =
      await $trpc.org.mail.domains.createNewDomain.mutate({
        orgPublicId: orgPublicId,
        domainName: newDomainNameValue.value
      });

    if (newDomainResponse.error) {
      buttonLoading.value = false;
      buttonLabel.value = 'Add Domain';
      newDomainNameValid.value = false;
      newDomainResponseError.value = newDomainResponse.error;
      return;
    }
    buttonLoading.value = false;
    buttonLabel.value = 'All done';

    const toast = useToast();
    toast.add({
      id: 'domain_added',
      title: 'Domain Added',
      description: `${newDomainNameValue.value} has been added successfully.`,
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    });

    setTimeout(() => {
      navigateTo(
        `/settings/org/${orgPublicId}/mail/domains/${newDomainResponse.domainId}/?new=true`
      );
    }, 1500);
  }

  const isPro = ref<boolean | null | undefined>(null);
  if (useEE().config.modules.billing) {
    const { data: isProQuery } =
      await $trpc.org.setup.billing.isPro.useLazyQuery(
        {
          orgPublicId: orgPublicId
        },
        { server: false }
      );

    isPro.value = isProQuery.value?.isPro;
  } else {
    isPro.value = true;
  }
</script>

<template>
  <div class="h-full w-full flex flex-col items-start gap-8 p-4">
    <div class="w-full flex flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-2xl font-display">Domains</span>
          <span class="text-sm">Manage your organizations domains</span>
        </div>
      </div>
    </div>
    <div
      v-if="isPro"
      class="w-full flex flex-col gap-4">
      <span class="text-xl font-semibold">Add a new domain</span>
      <UnUiInput
        v-model:value="newDomainNameValue"
        v-model:valid="newDomainNameValid"
        v-model:validationMessage="newDomainNameValidationMessage"
        label="Domain name"
        placeholder=""
        :schema="z.string().min(4).includes('.')" />
      <UnUiButton
        :label="buttonLabel"
        :loading="buttonLoading"
        :disabled="!formValid"
        size="sm"
        @click="createNewDomain()" />
      <div
        v-if="newDomainResponseError"
        class="w-fit rounded-lg bg-red-3 px-4 py-1">
        {{ newDomainResponseError }}
      </div>
    </div>
    <div
      v-if="!isPro"
      class="w-full flex flex-col gap-4">
      <span class="text-xl font-semibold">Add a new domain</span>
      <span
        >Sorry, your current billing plan does not support adding custom
        domains.</span
      >
      <!-- <span>Supported plans are: {{ canAddDomainAllowedPlans }}</span> -->
    </div>
  </div>
</template>
