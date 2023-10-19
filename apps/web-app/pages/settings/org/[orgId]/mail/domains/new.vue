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

    navigateTo(
      `/settings/org/${orgPublicId}/mail/domains/${newDomainResponse.domainId}/?new=true`
    );
  }

  const canAddDomain = ref<boolean | null | undefined>(null);
  const canAddDomainAllowedPlans = ref<string[]>();
  const dataPending = ref(true);

  if (useEE().config.modules.billing) {
    dataPending.value = true;

    const { data: canUseFeature, pending } =
      await $trpc.org.setup.billing.canUseFeature.useLazyQuery(
        {
          orgPublicId: orgPublicId,
          feature: 'customDomains'
        },
        { server: false }
      );

    canAddDomain.value = canUseFeature.value?.canUse;
    canAddDomainAllowedPlans.value = canUseFeature.value?.allowedPlans;
    dataPending.value = false;
  } else {
    dataPending.value = false;
    canAddDomain.value = true;
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
      v-if="dataPending"
      class="w-full flex flex-row justify-center gap-4 rounded-xl rounded-tl-2xl bg-base-3 p-8">
      <icon
        name="svg-spinners:3-dots-fade"
        size="24" />
      <span>Checking Domains</span>
    </div>
    <div
      v-if="!dataPending && canAddDomain"
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
      v-if="!dataPending && !canAddDomain"
      class="w-full flex flex-col gap-4">
      <span class="text-xl font-semibold">Add a new domain</span>
      <span
        >Sorry, your current billing plan does not support adding custom
        domains.</span
      >
      <span>Supported plans are: {{ canAddDomainAllowedPlans }}</span>
    </div>
  </div>
</template>
