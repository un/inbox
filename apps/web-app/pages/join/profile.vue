<script setup lang="ts">
  import { z } from 'zod';
  import { useFileDialog } from '@vueuse/core';
  import {
    navigateTo,
    definePageMeta,
    useRuntimeConfig,
    useNuxtApp,
    useToast,
    ref,
    watch,
    useCookie
  } from '#imports';
  import { useUtils } from '~/composables/utils';

  const { $trpc } = useNuxtApp();
  definePageMeta({ auth: true });
  const uploadLoading = ref(false);
  const buttonLoading = ref(false);
  const buttonLabel = ref('Save profile');
  const pageError = ref(false);
  const imageUrl = ref<string | null>();
  const fNameValid = ref<boolean | 'remote' | null>(null);
  const fNameValue = ref('');
  const lNameValid = ref<boolean | 'remote' | null>(null);
  const lNameValue = ref('');
  const titleValue = ref('');
  const blurbValue = ref('');

  const orgShortcode = ref('');
  if (process.client) {
    const orgShortcodeCookie = useCookie('un-join-org-shortcode').value;
    orgShortcodeCookie ? (orgShortcode.value = orgShortcodeCookie || '') : null;
  }
  const wasInvited = ref(false);
  if (process.client) {
    const inviteCodeCookie = useCookie('un-invite-code').value;
    if (inviteCodeCookie && inviteCodeCookie !== '') {
      wasInvited.value = true;
    }
  }

  const { data: accountOrgProfile, pending } =
    await $trpc.account.profile.getOrgMemberProfile.useLazyQuery(
      {
        orgShortcode: orgShortcode.value as string
      },
      { server: false }
    );

  watch(accountOrgProfile, (newVal) => {
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

  //functions
  async function selectAvatar() {
    resetFiles();
    openFileDialog();
  }
  //@ts-ignore
  selectedFilesOnChange(async (selectedFiles) => {
    uploadLoading.value = true;
    if (!selectedFiles || !selectedFiles[0]) return;
    if (!accountOrgProfile.value?.profile?.publicId) return;
    const formData = new FormData();
    // @ts-ignore
    const storageUrl = useRuntimeConfig().public.storageUrl;
    formData.append('file', selectedFiles[0]);
    formData.append('type', 'orgMember');
    formData.append(
      'publicId',
      accountOrgProfile.value?.profile?.publicId || ''
    );
    const response = (await $fetch(`${storageUrl}/api/avatar`, {
      method: 'post',
      body: formData,
      credentials: 'include'
    })) as any;
    if (response.avatarTimestamp) {
      imageUrl.value = useUtils().generateAvatarUrl({
        publicId: accountOrgProfile.value?.profile?.publicId,
        avatarTimestamp: new Date(),
        size: '5xl'
      });
    }
    uploadLoading.value = false;
  });

  async function saveProfile() {
    const toast = useToast();
    buttonLoading.value = true;
    buttonLabel.value = 'Saving...';

    if (!accountOrgProfile.value?.profile?.publicId) {
      pageError.value = true;
      buttonLoading.value = false;
      buttonLabel.value = 'Save profile';
      return;
    }
    const updateAccountProfileTrpc =
      $trpc.account.profile.updateOrgMemberProfile.useMutation();
    await updateAccountProfileTrpc.mutate({
      profilePublicId: accountOrgProfile.value.profile.publicId,
      fName: fNameValue.value,
      lName: lNameValue.value,
      title: titleValue.value,
      blurb: blurbValue.value,
      handle: accountOrgProfile.value.profile.handle || ''
    });
    if (updateAccountProfileTrpc.status.value === 'error') {
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
    toast.add({
      id: 'profile_saved',
      title: 'Profile Saved',
      description: 'Profile has been updated successfully',
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    });

    navigateTo('/unboarding');
  }
</script>

<template>
  <div class="flex h-screen w-screen flex-col items-center justify-between p-4">
    <div
      class="flex w-full max-w-72 grow flex-col items-center justify-center gap-8 pb-14 md:max-w-xl">
      <h1 class="mb-4 flex flex-col gap-2 text-center">
        <span class="text-2xl font-medium leading-none">Let's make your</span>
        <span class="font-display text-5xl leading-none">UnInbox</span>
      </h1>
      <h2
        v-if="wasInvited"
        class="text-center text-xl font-semibold">
        Edit your profile
      </h2>
      <h2
        v-if="wasInvited"
        class="text-center text-xl font-semibold">
        Got time for a profile?
      </h2>
      <div class="flex w-full flex-row justify-stretch gap-2">
        <UnUiTooltip
          text="Choose your username"
          class="w-full">
          <div class="bg-base-5 h-2 w-full rounded" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Secure your account"
          class="w-full">
          <div class="bg-base-5 h-2 w-full rounded" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Set up your organization"
          class="w-full">
          <div class="bg-base-5 h-2 w-full rounded" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Create your profile"
          class="w-full">
          <div class="bg-base-9 h-2 w-full rounded" />
        </UnUiTooltip>
      </div>
      <p
        v-if="wasInvited"
        class="text-center">
        This profile has been set by the person who invited you. You can have a
        separate profile for each organization you join.
        <span class="font-italic">Skip this step if you like</span>
      </p>
      <p
        v-if="!wasInvited"
        class="text-center">
        You can have a different profile for each organization you join, lets
        start with your first one!
        <span class="font-italic">Skip this step if you like</span>
      </p>
      <div
        v-if="pending"
        class="bg-base-3 flex w-full flex-row justify-center gap-4 rounded-xl rounded-tl-2xl p-4">
        <UnUiIcon
          name="i-svg-spinners:3-dots-fade"
          size="24" />
        <span>Loading your profile</span>
      </div>
      <div
        v-if="!pending"
        class="flex w-full flex-col items-center justify-center gap-8 pb-14">
        <div class="flex flex-col items-center gap-2">
          <button
            type="button"
            class="border-1 border-base-7 bg-base-3 hover:border-base-8 h-[128px] w-[128px] cursor-pointer rounded-lg bg-cover bg-center"
            :style="imageUrl ? `background-image: url(${imageUrl})` : ''"
            @click="selectAvatar()">
            <div
              v-if="!imageUrl"
              class="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
              <div class="h-[32px] w-[32px]">
                <UnUiIcon
                  :name="
                    uploadLoading
                      ? 'i-svg-spinners:3-dots-fade'
                      : 'i-ph-image-square'
                  "
                  size="100%" />
              </div>
              <p class="lt-md:text-xs text-center text-sm">
                Upload profile image
              </p>
            </div>
          </button>
          <UnUiButton
            v-if="imageUrl"
            label="Upload new image"
            icon="i-ph-image-square"
            :loading="uploadLoading"
            @click="selectAvatar()" />
        </div>
        <div class="flex flex-col flex-wrap gap-4 md:flex-row">
          <UnUiInput
            v-model:value="fNameValue"
            v-model:valid="fNameValid"
            label="First Name"
            :schema="z.string().trim()"
            placeholder="" />
          <UnUiInput
            v-model:value="lNameValue"
            v-model:valid="lNameValid"
            label="Last Name"
            :schema="z.string().trim()"
            placeholder="" />
        </div>
        <div
          class="grid w-full items-center gap-4 sm:grid-rows-2 md:grid-cols-2">
          <UnUiButton
            label="Skip"
            icon="i-ph-skip-forward"
            variant="outline"
            block
            @click="navigateTo('/unboarding')" />

          <UnUiButton
            :label="buttonLabel"
            icon="i-ph-user"
            :loading="buttonLoading"
            :disabled="pending"
            block
            @click="saveProfile()" />
        </div>
        <p
          v-if="pageError"
          class="bg-red-9 w-full rounded p-4 text-center">
          Something went wrong, please try again or contact our support team if
          it persists
        </p>
      </div>
    </div>
  </div>
</template>
