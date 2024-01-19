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
  const orgSlugValid = ref<boolean | 'remote' | null>(null);
  const orgSlugValue = ref('');
  const orgSlugTempValue = ref('');
  const orgSlugValidationMessage = ref('');

  const formValid = computed(() => {
    return orgNameValid.value && orgSlugValid.value;
  });

  watchDebounced(
    orgNameValue,
    async () => {
      if (orgSlugTempValue.value === orgSlugValue.value) {
        const newValue = orgNameValue.value
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        orgSlugValue.value = newValue;
        orgSlugTempValue.value = newValue;
      }
    },
    {
      debounce: 500,
      maxWait: 5000
    }
  );
  watchDebounced(
    orgSlugValue,
    async () => {
      if (orgSlugValid.value === 'remote') {
        const { available, error } =
          await $trpc.org.crud.checkSlugAvailability.query({
            slug: orgSlugValue.value
          });
        if (!available) {
          orgSlugValid.value = false;
          orgSlugValidationMessage.value = 'Not available';
        }
        available && (orgSlugValid.value = true);
      }
    },
    {
      debounce: 500,
      maxWait: 5000
    }
  );

  //functions
  async function createNewOrg() {
    const toast = useToast();
    newButtonLoading.value = true;
    newButtonLabel.value = 'Creating your organization';

    const createNewOrgTrpc = $trpc.org.crud.createNewOrg.useMutation();
    await createNewOrgTrpc.mutate({
      orgName: orgNameValue.value,
      orgSlug: orgSlugValue.value
    });
    if (createNewOrgTrpc.status.value === 'error') {
      newButtonLoading.value = false;
      pageError.value = true;
      newButtonLabel.value = 'Make my organization';

      toast.add({
        id: 'create_new_org_fail',
        title: 'Org Creation Failed',
        description: `${orgNameValue.value} organization could not be created.`,
        color: 'red',
        icon: 'i-ph-warning-circle',
        timeout: 5000
      });
      return;
    }

    newButtonLoading.value = false;
    newButtonLabel.value = 'All Done!';
    refreshNuxtData('getUserOrgsNav');
    toast.add({
      id: 'org_created',
      title: 'New Organization Created',
      description: `Your new organization ${orgNameValue.value} has been created successfully, redirecting...`,
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    });
    setTimeout(() => {
      navigateTo(`/${orgSlugValue.value}/settings/org/`);
    }, 2000);
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
        :schema="z.string().trim().min(2).max(32)" />
      <UnUiInput
        v-model:value="orgSlugValue"
        v-model:valid="orgSlugValid"
        v-model:validationMessage="orgSlugValidationMessage"
        locked
        remote-validation
        label="Organization Slug"
        placeholder=""
        :schema="
          z
            .string()
            .min(5)
            .max(64)
            .regex(/^[a-z0-9]*$/, {
              message: 'Only letters and numbers'
            })
            .trim()
        " />

      <div>
        <UnUiButton
          :label="newButtonLabel"
          icon="i-ph-house"
          :loading="newButtonLoading"
          :disabled="!formValid"
          @click="createNewOrg()" />
      </div>
    </div>
  </div>
</template>
