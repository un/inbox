<script setup lang="ts">
  import { z } from 'zod';
  import { useFileDialog } from '@vueuse/core';
  import {
    computed,
    ref,
    refreshNuxtData,
    useNuxtApp,
    useRuntimeConfig,
    useToast,
    watch
  } from '#imports';
  import { useUtils } from '~/composables/utils';

  const { $trpc } = useNuxtApp();
  const uploadLoading = ref(false);
  const buttonLoading = ref(false);
  const buttonLabel = ref('Save profile');
  const pageError = ref(false);
  const imageUrl = ref<string | null>();
  const imageId = ref<string | null>();
  const orgNameValid = ref<boolean | 'remote' | null>(null);
  const orgNameValue = ref('');
  const orgNameValidationMessage = ref('');

  const { data: initialOrgProfile, pending } =
    await $trpc.org.setup.profile.getOrgProfile.useLazyQuery(
      {},
      { server: false }
    );

  watch(initialOrgProfile, (newVal) => {
    if (newVal && newVal.orgProfile) {
      orgNameValue.value = newVal.orgProfile.name;
      newVal.orgProfile.avatarTimestamp
        ? (imageUrl.value = useUtils().generateAvatarUrl({
            publicId: newVal.orgProfile.publicId,
            avatarTimestamp: newVal.orgProfile.avatarTimestamp,
            size: '5xl'
          }))
        : null;
    }
  });

  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    files: selectedFiles,
    open: openFileDialog,
    reset: resetFiles,
    onChange: selectedFilesOnChange
  } = useFileDialog({
    multiple: false,
    accept: 'image/*',
    reset: true
  });

  const formValid = computed(() => {
    if (imageId.value) return true;
    if (orgNameValue.value !== initialOrgProfile.value?.orgProfile?.name) {
      return orgNameValid.value === true;
    }
    return false;
  });

  //functions
  async function selectAvatar() {
    resetFiles();
    openFileDialog();
  }
  selectedFilesOnChange(async (selectedFiles: any) => {
    const orgPublicId = initialOrgProfile.value?.orgProfile.publicId;
    if (!orgPublicId) return;
    uploadLoading.value = true;
    if (!selectedFiles) return;
    const formData = new FormData();
    // @ts-ignore
    const storageUrl = useRuntimeConfig().public.storageUrl as string;
    formData.append('file', selectedFiles[0]);
    formData.append('type', 'org');
    formData.append('publicId', orgPublicId);
    const response = (await $fetch(`${storageUrl}/api/avatar`, {
      method: 'post',
      body: formData,
      credentials: 'include'
    })) as any;

    if (response.avatarTimestamp) {
      imageUrl.value = useUtils().generateAvatarUrl({
        publicId: orgPublicId,
        avatarTimestamp: new Date(),
        size: '5xl'
      }) as string;
    }
    refreshNuxtData('getAccountOrgsNav');
    uploadLoading.value = false;
    //TODO: make the image only appear once it has been loaded to avoid blank box, find a way to show skeleton loading animation
  });

  async function saveProfile() {
    const toast = useToast();
    buttonLoading.value = true;
    buttonLabel.value = 'Saving...';
    const setOrgProfileTrpc =
      $trpc.org.setup.profile.setOrgProfile.useMutation();
    await setOrgProfileTrpc.mutate({
      orgName: orgNameValue.value
    });

    if (setOrgProfileTrpc.status.value === 'error') {
      pageError.value = true;
      buttonLoading.value = false;
      buttonLabel.value = 'Save profile';
      toast.add({
        id: 'save_profile_fail',
        title: 'Could not save profile',
        description: `The profile could not be saved.`,
        color: 'red',
        icon: 'i-ph-warning-circle',
        timeout: 5000
      });
      return;
    }

    buttonLoading.value = false;
    buttonLabel.value = 'All done!';
    refreshNuxtData('getUserOrgsNav');

    toast.add({
      id: 'profile_saved',
      title: 'Profile Saved',
      description: 'Profile has been updated successfully',
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    });
  }
</script>

<template>
  <div class="flex h-full w-full flex-col items-start gap-8 p-4">
    <div class="flex w-full flex-row items-center justify-between">
      <span class="font-display text-2xl">Organization Profile</span>
    </div>
    <div
      v-if="pending"
      class="bg-base-3 flex w-full flex-row justify-center gap-4 rounded-xl rounded-tl-2xl p-8">
      <UnUiIcon
        name="i-svg-spinners:3-dots-fade"
        size="24" />
      <span>Loading organization profile</span>
    </div>
    <div
      v-if="!pending"
      class="flex w-full flex-col items-start justify-center gap-8 pb-14">
      <div class="flex flex-col gap-2">
        <button
          type="button"
          class="border-1 border-base-7 bg-base-3 hover:border-base-8 hover:bg-base-4 h-[80px] w-[80px] cursor-pointer rounded-lg bg-cover bg-center md:h-[128px] md:w-[128px]"
          :style="imageUrl ? `background-image: url(${imageUrl})` : ''"
          @click="selectAvatar()">
          <div
            v-if="!imageUrl"
            class="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
            <div class="h-[32px] w-[32px]">
              <UnUiIcon
                :name="
                  uploadLoading
                    ? 'i-svg-spinners-3-dots-fade'
                    : 'i-ph-image-square'
                "
                size="100%" />
            </div>
            <p class="lt-md:text-xs text-center text-sm">Upload image</p>
          </div>
        </button>
        <UnUiButton
          v-if="imageUrl"
          label="Upload new image"
          icon="i-ph-image-square"
          :loading="uploadLoading"
          @click="selectAvatar()" />
      </div>

      <UnUiInput
        v-model:value="orgNameValue"
        v-model:valid="orgNameValid"
        v-model:validationMessage="orgNameValidationMessage"
        label="Organisation Name"
        placeholder=""
        :locked="true"
        :schema="z.string().trim().min(1)" />
      <UnUiButton
        :label="buttonLabel"
        icon="i-ph-floppy-disk"
        :loading="buttonLoading"
        :disabled="!formValid"
        @click="saveProfile()" />
      <p
        v-if="pageError"
        class="bg-red-9 w-full rounded p-4 text-center">
        Something went wrong, please try again or contact our support team if it
        persists
      </p>
    </div>
  </div>
</template>
