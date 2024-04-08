<script setup lang="ts">
  import { z } from 'zod';
  import { useFileDialog } from '@vueuse/core';
  import {
    useRuntimeConfig,
    useNuxtApp,
    useToast,
    ref,
    refreshNuxtData,
    useRoute,
    watch,
    navigateTo
  } from '#imports';
  import { useUtils } from '~/composables/utils';
  import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';

  const breakpoints = useBreakpoints(breakpointsTailwind);
  const isMobile = breakpoints.smaller('lg'); // only smaller than lg

  const { $trpc } = useNuxtApp();
  const uploadLoading = ref(false);
  const buttonLoading = ref(false);
  const buttonLabel = ref('Save profile');
  const pageError = ref(false);
  const imageUrl = ref<string | null>();
  const fNameValid = ref<boolean | 'remote' | null>(null);
  const fNameValue = ref('');
  const lNameValid = ref<boolean | 'remote' | null>(null);
  const lNameValue = ref('');
  const titleValid = ref<boolean | 'remote' | null>(null);
  const titleValue = ref('');
  const blurbValid = ref<boolean | 'remote' | null>(null);
  const blurbValue = ref('');

  const orgShortcode = useRoute().params.orgShortcode as string;

  const { data: initialAccountProfile, pending } =
    await $trpc.account.profile.getOrgMemberProfile.useLazyQuery(
      { orgShortcode: orgShortcode },
      { server: false }
    );

  watch(
    initialAccountProfile,
    (newVal) => {
      if (newVal && newVal.profile) {
        fNameValue.value = newVal.profile.firstName || '';
        lNameValue.value = newVal.profile.lastName || '';
        titleValue.value = newVal.profile.title || '';
        blurbValue.value = newVal.profile.blurb || '';

        if (newVal.profile.avatarTimestamp) {
          imageUrl.value = useUtils().generateAvatarUrl({
            publicId: newVal.profile.publicId!,
            avatarTimestamp: newVal.profile.avatarTimestamp,
            size: '5xl'
          });
        }
      }
    }
    // ,
    // { immediate: true }
  );

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

  //functions
  async function selectAvatar() {
    resetFiles();
    openFileDialog();
  }
  //@ts-ignore
  selectedFilesOnChange(async (selectedFiles) => {
    uploadLoading.value = true;
    if (!selectedFiles || !selectedFiles[0]) return;
    if (!initialAccountProfile.value?.profile.publicId) return;
    const formData = new FormData();
    // @ts-ignore
    const storageUrl = useRuntimeConfig().public.storageUrl;
    formData.append('file', selectedFiles[0]);
    formData.append('type', 'orgMember');
    formData.append(
      'publicId',
      initialAccountProfile.value?.profile.publicId || ''
    );
    const response = (await $fetch(`${storageUrl}/api/avatar`, {
      method: 'post',
      body: formData,
      credentials: 'include'
    })) as any;
    if (response.avatarTimestamp) {
      imageUrl.value = useUtils().generateAvatarUrl({
        publicId: initialAccountProfile.value?.profile.publicId,
        avatarTimestamp: new Date(),
        size: '5xl'
      });
    }
    refreshNuxtData('getOrgMemberSingleProfileNav');
    uploadLoading.value = false;
  });

  async function saveProfile() {
    const toast = useToast();
    buttonLoading.value = true;
    buttonLabel.value = 'Saving...';

    if (!initialAccountProfile.value?.profile?.publicId) {
      pageError.value = true;
      buttonLoading.value = false;
      buttonLabel.value = 'Save profile';
      return;
    }
    const updateOrgMemberProfileTrpc =
      $trpc.account.profile.updateOrgMemberProfile.useMutation();
    await updateOrgMemberProfileTrpc.mutate({
      profilePublicId: initialAccountProfile.value.profile.publicId,
      fName: fNameValue.value,
      lName: lNameValue.value,
      title: titleValue.value,
      blurb: blurbValue.value,
      handle: initialAccountProfile.value.profile.handle || ''
    });

    if (updateOrgMemberProfileTrpc.status.value === 'error') {
      pageError.value = true;
      buttonLoading.value = false;
      buttonLabel.value = 'Save profile';
      toast.add({
        id: 'save_profile_fail',
        title: 'Failed to save profile',
        description: `Something went wrong when saving your profile. Refresh the page and try again.`,
        color: 'red',
        icon: 'i-ph-warning-circle',
        timeout: 5000
      });
      return;
    }

    buttonLoading.value = false;
    buttonLabel.value = 'All done!';
    refreshNuxtData('getOrgMemberSingleProfileNav');
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
      <div class="flex flex-row gap-2">
        <UnUiButton
          v-if="isMobile"
          icon="i-ph-arrow-left"
          square
          variant="soft"
          @click="navigateTo(`/${orgShortcode}/settings`)" />
        <span class="font-display text-2xl">Your Profile</span>
      </div>
    </div>
    <div
      v-if="pending"
      class="bg-base-3 flex w-full flex-row justify-center gap-4 rounded-xl rounded-tl-2xl p-4">
      <UnUiIcon
        name="i-svg-spinners-90-ring"
        size="24" />
      <span>Loading your profiles</span>
    </div>
    <div
      v-if="!pending"
      class="flex w-full flex-col items-start justify-center gap-8 pb-14">
      <div class="flex flex-col gap-2">
        <button
          type="button"
          class="border-1 border-base-7 bg-base-3 hover:border-base-8 h-[80px] w-[80px] cursor-pointer rounded-lg bg-cover bg-center md:h-[128px] md:w-[128px]"
          :style="imageUrl ? `background-image: url(${imageUrl})` : ''"
          @click="selectAvatar()">
          <div
            v-if="!imageUrl"
            class="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
            <div class="h-[32px] w-[32px]">
              <UnUiIcon
                :name="
                  uploadLoading ? 'i-svg-spinners-90-ring' : 'i-ph-image-square'
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
      <div class="flex flex-row flex-wrap gap-4">
        <UnUiInput
          v-model:value="fNameValue"
          v-model:valid="fNameValid"
          label="First Name"
          :schema="z.string().trim().optional()"
          placeholder="" />
        <UnUiInput
          v-model:value="lNameValue"
          v-model:valid="lNameValid"
          label="Last Name"
          :schema="z.string().trim().optional()"
          placeholder="" />
      </div>
      <div class="flex flex-row flex-wrap gap-4">
        <UnUiInput
          v-model:value="titleValue"
          v-model:valid="titleValid"
          label="Title"
          :schema="z.string().trim().optional()"
          placeholder="" />
        <UnUiInput
          v-model:value="blurbValue"
          v-model:valid="blurbValid"
          label="Bio"
          :schema="z.string().trim().optional()"
          placeholder="" />
      </div>
      <UnUiButton
        :label="buttonLabel"
        icon="i-ph-floppy-disk"
        :loading="buttonLoading"
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
