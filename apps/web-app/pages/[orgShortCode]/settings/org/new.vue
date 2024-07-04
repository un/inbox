<script setup lang="ts">
  import { z } from 'zod';
  import {
    computed,
    navigateTo,
    ref,
    refreshNuxtData,
    useNuxtApp,
    useToast,
    watchDebounced,
    useRoute
  } from '#imports';
  import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
  import { useHead } from 'unhead';

  useHead({
    title: 'Org Settings'
  });

  const breakpoints = useBreakpoints(breakpointsTailwind);
  const isMobile = breakpoints.smaller('lg'); // only smaller than lg
  const orgShortCode = useRoute().params.orgShortCode as string;

  const { $trpc } = useNuxtApp();

  const newButtonLoading = ref(false);
  const newButtonLabel = ref('Make my organization');
  const pageError = ref(false);

  //Form Fields
  const orgNameValid = ref<boolean | 'remote' | null>(null);
  const orgNameValue = ref('');
  const orgNameValidationMessage = ref('');
  const orgShortCodeValid = ref<boolean | 'remote' | null>(null);
  const orgShortCodeValue = ref('');
  const orgShortCodeTempValue = ref('');
  const orgShortCodeValidationMessage = ref('');

  const formValid = computed(() => {
    return orgNameValid.value && orgShortCodeValid.value;
  });

  watchDebounced(
    orgNameValue,
    async () => {
      if (orgShortCodeTempValue.value === orgShortCodeValue.value) {
        const newValue = orgNameValue.value
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        orgShortCodeValue.value = newValue;
        orgShortCodeTempValue.value = newValue;
      }
    },
    {
      debounce: 500,
      maxWait: 5000
    }
  );
  watchDebounced(
    orgShortCodeValue,
    async () => {
      if (orgShortCodeValid.value === 'remote') {
        const { available } =
          await $trpc.org.crud.checkShortCodeAvailability.query({
            shortcode: orgShortCodeValue.value
          });
        if (!available) {
          orgShortCodeValid.value = false;
          orgShortCodeValidationMessage.value = 'Not available';
        }
        available && (orgShortCodeValid.value = true);
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
      orgShortCode: orgShortCodeValue.value
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
    refreshNuxtData('getAccountOrgsNav');
    toast.add({
      id: 'org_created',
      title: 'New Organization Created',
      description: `Your new organization ${orgNameValue.value} has been created successfully, redirecting...`,
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    });

    navigateTo(`/${orgShortCodeValue.value}/settings/org/`);
  }
</script>

<template>
  <div class="flex h-full w-full flex-col items-start gap-8 p-4">
    <div class="flex w-full flex-row items-center justify-between">
      <div class="flex flex-row gap-2">
        <UnUiButton
          v-if="isMobile"
          icon="i-ph-arrow-left"
          square
          variant="soft"
          @click="navigateTo(`/${orgShortCode}/settings`)" />

        <span class="font-display text-2xl">Create a new organization</span>
      </div>
    </div>
    <div class="flex w-full flex-col gap-4">
      <UnUiInput
        v-model:value="orgNameValue"
        v-model:valid="orgNameValid"
        v-model:validationMessage="orgNameValidationMessage"
        label="Organization Name"
        placeholder=""
        :schema="z.string().trim().min(2).max(32)" />
      <UnUiInput
        v-model:value="orgShortCodeValue"
        v-model:valid="orgShortCodeValid"
        v-model:validationMessage="orgShortCodeValidationMessage"
        locked
        remote-validation
        label="Organization ShortCode"
        placeholder=""
        :schema="
          z
            .string()
            .min(5)
            .max(64)
            .regex(/^[a-z0-9]*$/, {
              message: 'Only lowercase letters and numbers'
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
