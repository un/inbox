<script setup lang="ts">
  import { z } from 'zod';
  import { useFileDialog } from '@vueuse/core';
  const { $trpc, $i18n } = useNuxtApp();
  definePageMeta({ auth: true });
  const uploadLoading = ref(false);
  const buttonLoading = ref(false);
  const buttonLabel = ref('Save profile');
  const pageError = ref(false);
  const imageUrl = ref<string | null>();
  const imageId = ref<string | null>();
  const fNameValid = ref<boolean | 'remote' | null>(null);
  const fNameValue = ref('');
  const lNameValid = ref<boolean | 'remote' | null>(null);
  const lNameValue = ref('');
  const titleValue = ref('');
  const blurbValue = ref('');

  const orgSlug = ref('');
  if (process.client) {
    const orgSlugCookie = useCookie('un-join-org-slug').value;
    orgSlugCookie ? (orgSlug.value = orgSlugCookie || '') : null;
  }
  const wasInvited = ref(false);
  if (process.client) {
    const inviteCodeCookie = useCookie('un-invite-code').value;
    if (inviteCodeCookie && inviteCodeCookie !== '') {
      wasInvited.value = true;
    }
  }

  const { data: userOrgProfile, pending } =
    await $trpc.user.profile.getUserOrgProfile.useLazyQuery(
      {
        orgSlug: orgSlug.value as string
      },
      { server: false }
    );

  watch(userOrgProfile, (newVal) => {
    if (newVal && newVal.profile) {
      fNameValue.value = newVal.profile.firstName || '';
      lNameValue.value = newVal.profile.lastName || '';
      titleValue.value = newVal.profile.title || '';
      blurbValue.value = newVal.profile.blurb || '';

      imageUrl.value = useUtils().generateAvatarUrl(
        'user',
        newVal.profile.publicId,
        '5xl'
      ) as string;
    }
  });

  const {
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
    if (!selectedFiles) return;
    const formData = new FormData();
    // @ts-ignore
    const storageUrl = useRuntimeConfig().public.storageUrl;
    formData.append('file', selectedFiles[0]);
    formData.append('type', 'user');
    formData.append('publicId', userOrgProfile.value?.profile?.publicId || '');
    await useFetch(`${storageUrl}/api/avatar`, {
      method: 'post',
      body: formData,
      credentials: 'include'
    });

    imageUrl.value = useUtils().generateAvatarUrl(
      'user',
      userOrgProfile.value?.profile.publicId || '',
      '5xl'
    ) as string;

    uploadLoading.value = false;
  });

  async function saveProfile() {
    const toast = useToast();
    buttonLoading.value = true;
    buttonLabel.value = 'Saving...';

    if (!userOrgProfile.value?.profile?.publicId) {
      pageError.value = true;
      buttonLoading.value = false;
      buttonLabel.value = 'Save profile';
      return;
    }
    const updateUserProfileTrpc =
      $trpc.user.profile.updateUserProfile.useMutation();
    await updateUserProfileTrpc.mutate({
      profilePublicId: userOrgProfile.value.profile.publicId,
      fName: fNameValue.value,
      lName: lNameValue.value,
      title: titleValue.value,
      blurb: blurbValue.value,
      handle: userOrgProfile.value.profile.handle || ''
    });
    if (updateUserProfileTrpc.status.value === 'error') {
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
    setTimeout(() => {
      navigateTo('/unboarding');
    }, 1000);
  }
</script>

<template>
  <div class="h-screen w-screen flex flex-col items-center justify-between p-4">
    <div
      class="max-w-72 w-full flex grow flex-col items-center justify-center gap-8 pb-14 md:max-w-xl">
      <h1 class="mb-4 text-center text-2xl font-display">
        Let's make your <br /><span class="text-5xl">UnInbox</span>
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
      <div class="w-full flex flex-row justify-stretch gap-2">
        <UnUiTooltip
          text="Choose your username"
          class="w-full">
          <div
            class="bg-primary-400 h-2 w-full rounded"
            @click="navigateTo('/join')" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Secure your account"
          class="w-full">
          <div
            class="bg-primary-400 h-2 w-full rounded"
            @click="navigateTo('/join/passkey')" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Set up your organization"
          class="w-full">
          <div class="bg-primary-400 h-2 w-full rounded" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Create your profile"
          class="w-full">
          <div class="bg-primary-600 h-2 w-full rounded" />
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
        class="w-full flex flex-row justify-center gap-4 rounded-xl rounded-tl-2xl bg-base-3 p-8">
        <UnUiIcon
          name="i-svg-spinners:3-dots-fade"
          size="24" />
        <span>Loading your profile</span>
      </div>
      <div
        v-if="!pending"
        class="w-full flex flex-col items-center justify-center gap-8 pb-14">
        <div class="flex flex-col items-center gap-2">
          <button
            type="button"
            class="h-[80px] w-[80px] cursor-pointer border-1 border-base-7 rounded-lg bg-base-3 bg-base-4 bg-cover bg-center md:h-[128px] md:w-[128px] hover:border-base-8"
            :style="imageUrl ? `background-image: url(${imageUrl})` : ''"
            @click="selectAvatar()">
            <div
              v-if="!imageUrl"
              class="h-full w-full flex flex-col items-center justify-center gap-2 p-4">
              <div class="h-[32px] w-[32px]">
                <UnUiIcon
                  :name="
                    uploadLoading
                      ? 'i-svg-spinners:3-dots-fade'
                      : 'i-ph-image-square'
                  "
                  size="100%" />
              </div>
              <p class="text-center text-sm lt-md:text-xs">Upload image</p>
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
          class="grid w-full items-center gap-4 md:grid-cols-2 sm:grid-rows-2">
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
          class="w-full rounded bg-red-9 p-4 text-center">
          Something went wrong, please try again or contact our support team if
          it persists
        </p>
      </div>
    </div>
  </div>
</template>
