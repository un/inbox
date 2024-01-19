<script setup lang="ts">
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

  const emit = defineEmits(['close']);

  const route = useRoute();
  const orgSlug = route.params.orgSlug as string;

  async function createNewDomain() {
    const toast = useToast();
    if (newDomainNameValid.value === false) return;
    toast.add({
      id: 'adding_domain',
      title: 'Adding Domain - Please wait',
      description: `This could take up to 20 seconds.`,
      icon: 'i-ph-thumbs-up',
      timeout: 20000
    });
    buttonLoading.value = true;
    buttonLabel.value = 'Creating domain...';
    const createNewDomainTrpc =
      $trpc.org.mail.domains.createNewDomain.useMutation();
    await createNewDomainTrpc.mutate({
      domainName: newDomainNameValue.value
    });

    if (createNewDomainTrpc.status.value === 'error') {
      buttonLoading.value = false;
      buttonLabel.value = 'Add Domain';
      newDomainNameValid.value = false;
      toast.add({
        id: 'domain_add_fail',
        title: 'Domain Creation Failed',
        description: `${newDomainNameValue.value} domain could not be created.`,
        color: 'red',
        icon: 'i-ph-warning-circle',
        timeout: 5000
      });
      return;
    }
    buttonLoading.value = false;
    buttonLabel.value = 'All done';

    toast.remove('adding_domain');
    toast.add({
      id: 'domain_added',
      title: 'Domain Added',
      description: `${newDomainNameValue.value} has been added successfully.`,
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    });

    setTimeout(() => {
      emit('close');
    }, 1000);
  }

  const isPro = ref(false);
  if (useEE().config.modules.billing) {
    const { data: isProQuery } =
      await $trpc.org.setup.billing.isPro.useLazyQuery({}, { server: false });

    isPro.value = isProQuery.value?.isPro || false;
  } else {
    isPro.value = true;
  }
</script>

<template>
  <div class="h-full w-full flex flex-col items-start">
    <div
      v-if="isPro"
      class="w-full flex flex-col gap-4">
      <UnUiInput
        v-model:value="newDomainNameValue"
        v-model:valid="newDomainNameValid"
        v-model:validationMessage="newDomainNameValidationMessage"
        label="Domain name"
        placeholder=""
        :schema="z.string().trim().min(4).includes('.')" />
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
      <span>
        Sorry, your current billing plan does not support adding custom domains.
      </span>
    </div>
  </div>
</template>
