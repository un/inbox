<script setup lang="ts">
  import { z } from 'zod';
  import { useFileDialog } from '@vueuse/core';
  const { $trpc, $i18n } = useNuxtApp();
  definePageMeta({ auth: true });
  const uploadLoading = ref(false);
  const buttonLoading = ref(false);
  const buttonLabel = ref('Create my profile');
  const buttonSkipLoading = ref(false);
  const buttonSkipLabel = ref('Skip');
  const pageError = ref(false);
  const imageUrl = ref<string | null>();
  const imageId = ref<string | null>();

  const username = ref('');
  if (process.client) {
    const usernameCookie = useCookie('un-join-username').value;
    !usernameCookie
      ? navigateTo('/join')
      : (username.value = usernameCookie || '');
  }

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

  const {
    data: imageUploadSignedUrl,
    pending: imageUploadSignedUrlPending,
    error: imageUploadSignedUrlError
  } = await $trpc.user.profile.generateAvatarUploadUrl.useLazyQuery(void 0, {
    server: false
  });

  //Form Fields
  const fNameValid = ref<boolean | 'remote' | null>(null);
  const fNameValue = ref('');
  const fNameValidationMessage = ref('');
  const lNameValid = ref<boolean | 'remote' | null>(null);
  const lNameValue = ref('');
  const lNameValidationMessage = ref('');

  const formValid = computed(() => {
    return fNameValid.value === true && lNameValid.value === true;
  });

  //functions
  function selectAvatar() {
    if (imageUploadSignedUrlPending.value || imageUploadSignedUrlError.value) {
      console.log(
        JSON.stringify({
          imageUploadSignedUrlPending,
          imageUploadSignedUrlError
        })
      );
      console.log(imageUploadSignedUrlPending.value);
      return;
    }
    resetFiles();
    openFileDialog();
  }
  selectedFilesOnChange(async (selectedFiles) => {
    if (
      imageUploadSignedUrlPending.value ||
      imageUploadSignedUrlError.value ||
      !imageUploadSignedUrl.value
    )
      return;

    uploadLoading.value = true;
    if (!selectedFiles) return;
    const formData = new FormData();
    formData.append('file', selectedFiles[0]);
    await useFetch(imageUploadSignedUrl.value?.uploadURL, {
      method: 'post',
      body: formData
    });
    imageId.value = await $trpc.user.profile.awaitAvatarUpload.query({
      uploadId: imageUploadSignedUrl.value?.id
    });

    //TODO: make the image only appear once it has been loaded to avoid blank box
    imageUrl.value = `https://imagedelivery.net/${
      useRuntimeConfig().public.cfImagesAccountHash
    }/${imageId.value}`;
  });

  async function createUserProfile() {
    buttonLoading.value = true;
    buttonLabel.value = 'Creating your profile';

    const createProfileResponse = await $trpc.user.profile.createProfile.mutate(
      {
        fName: fNameValue.value,
        lName: lNameValue.value,
        imageId: imageId.value ? imageId.value : null,
        defaultProfile: true,
        handle: username.value
      }
    );

    if (!createProfileResponse.success && createProfileResponse.error) {
      buttonLoading.value = false;
      pageError.value = true;
      buttonLabel.value = 'Something went wrong!';
    }

    buttonLoading.value = false;
    buttonLabel.value = 'All Done!';

    navigateTo('/join/org');
  }
  async function createBlankProfile() {
    buttonSkipLoading.value = true;
    buttonSkipLabel.value = 'Skipping your profile';

    const createProfileResponse = await $trpc.user.profile.createProfile.mutate(
      {
        fName: username.value,
        lName: '@ UnInbox',
        imageId: imageId.value || '',
        defaultProfile: true,
        handle: username.value
      }
    );

    if (!createProfileResponse.success && createProfileResponse.error) {
      buttonSkipLoading.value = false;
      pageError.value = true;
      buttonSkipLabel.value = 'Something went wrong!';
    }

    buttonSkipLoading.value = false;
    buttonSkipLabel.value = 'All Done!';

    navigateTo('/join/org');
  }
</script>

<template>
  <div class="h-screen w-screen flex flex-col items-center justify-between p-4">
    <div
      class="max-w-72 w-full flex grow flex-col items-center justify-center gap-8 pb-14 md:max-w-xl">
      <h1 class="mb-4 text-center text-2xl font-display">
        Let's make your <br /><span class="text-5xl">UnInbox</span>
      </h1>
      <h2 class="text-center text-xl font-semibold">Got time for a profile?</h2>
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
          text="Create your profile"
          class="w-full">
          <div class="bg-primary-600 h-2 w-full rounded" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Set up your organization"
          class="w-full">
          <div class="bg-primary-400 h-2 w-full rounded" />
        </UnUiTooltip>
      </div>
      <p class="text-center">
        You can have a different profile for each organization you join, lets
        start with your first one!
        <span class="font-italic">Skip this step if you like</span>
      </p>
      <div
        class="grid items-center gap-4"
        :class="fNameValue || lNameValue ? 'grid-cols-2' : 'grid-cols-1'">
        <button
          class="h-[80px] w-[80px] cursor-pointer border-1 border-base-7 rounded-4 bg-base-3 bg-cover bg-center md:h-[128px] md:w-[128px] hover:border-base-8 md:rounded-6 hover:bg-base-4"
          :style="imageUrl ? `background-image: url(${imageUrl}/128x128)` : ''"
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
                class="h-[24px] w-[24px]" />
            </div>
            <p class="text-center text-sm lt-md:text-xs">Upload image</p>
          </div>
        </button>

        <div
          v-if="fNameValue || lNameValue"
          class="flex flex-col font-display lt-md:text-2xl md:text-3xl">
          <p>{{ fNameValue }}</p>
          <p>{{ lNameValue }}</p>
        </div>
      </div>
      <div
        class="grid w-full items-center gap-4 lt-md:grid-rows-2 md:grid-cols-2">
        <UnUiInput
          v-model:value="fNameValue"
          v-model:valid="fNameValid"
          v-model:validationMessage="fNameValidationMessage"
          width="full"
          label="First Name"
          placeholder=""
          :schema="z.string()" />
        <UnUiInput
          v-model:value="lNameValue"
          v-model:valid="lNameValid"
          v-model:validationMessage="lNameValidationMessage"
          width="full"
          label="Last Name"
          placeholder=""
          :schema="z.string()" />
      </div>
      <div class="grid w-full items-center gap-4 md:grid-cols-2 sm:grid-rows-2">
        <UnUiButton
          :label="buttonSkipLabel"
          icon="i-ph-skip-forward"
          variant="outline"
          block
          :loading="buttonSkipLoading"
          @click="createBlankProfile()" />

        <UnUiButton
          :label="buttonLabel"
          icon="i-ph-user"
          :loading="buttonLoading"
          :disabled="!formValid"
          block
          @click="createUserProfile()" />
      </div>
      <p
        v-if="pageError"
        class="w-full rounded bg-red-9 p-4 text-center">
        Something went wrong, please try again or contact our support team if it
        persists
      </p>
    </div>
  </div>
</template>
