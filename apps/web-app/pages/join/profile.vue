<script setup lang="ts">
  import { z } from 'zod';
  import { useFileDialog } from '@vueuse/core';
  const { $trpc, $i18n } = useNuxtApp();
  definePageMeta({ auth: true });
  const buttonLoading = ref(false);
  const uploadLoading = ref(false);
  const buttonLabel = ref('Create my profile');
  const pageError = ref(false);
  const imageUrl = ref<string | null>();
  const imageId = ref<string | null>();

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

  const imageUploadSignedUrl =
    await $trpc.user.profile.generateAvatarUploadUrl.query();

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
    resetFiles();
    openFileDialog();
  }
  selectedFilesOnChange(async (selectedFiles) => {
    uploadLoading.value = true;
    if (!selectedFiles) return;
    const formData = new FormData();
    formData.append('file', selectedFiles[0]);
    await useFetch(imageUploadSignedUrl.uploadURL, {
      method: 'post',
      body: formData
    });
    imageId.value = await $trpc.user.profile.awaitAvatarUpload.query({
      uploadId: imageUploadSignedUrl.id
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
        imageId: imageId.value || '',
        defaultProfile: true
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
</script>

<template>
  <div class="flex flex-col w-screen h-screen items-center justify-between p-4">
    <div
      class="flex flex-col max-w-72 md:max-w-xl items-center justify-center gap-8 w-full grow pb-14">
      <h1 class="font-display text-2xl text-center mb-4">
        Let's make your <br /><span class="text-5xl">UnInbox</span>
      </h1>
      <h2 class="font-semibold text-xl text-center">Got time for a profile?</h2>
      <div class="flex flex-row gap-2 w-full justify-stretch">
        <UnUiTooltip
          text="Choose your username"
          parentClass="w-full">
          <div
            class="h-2 bg-primary-6 rounded w-full"
            @click="navigateTo('/join')" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Secure your account"
          parentClass="w-full">
          <div
            class="h-2 bg-primary-6 w-full rounded"
            @click="navigateTo('/join/passkey')" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Create your profile"
          parentClass="w-full">
          <div
            class="h-2 bg-primary-9 w-full rounded"
            @click="navigateTo('/join/profile')" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Set up your organization"
          parentClass="w-full">
          <div
            class="h-2 bg-primary-6 w-full rounded"
            @click="navigateTo('/join/org')" />
        </UnUiTooltip>
      </div>
      <p class="text-center">
        You can have a different profile for each organization you join, lets
        start with your first one!
        <span class="font-italic">Skip this step if you like</span>
      </p>
      <div
        class="grid gap-4 items-center"
        :class="fNameValue || lNameValue ? 'grid-cols-2' : 'grid-cols-1'">
        <button
          type="button"
          class="bg-base-3 border-base-7 border-1 lt-md:(h-[80px] w-[80px] rounded-4) md:(h-[128px] w-[128px] rounded-6) hover:(bg-base-4 border-base-8) cursor-pointer bg-cover bg-center"
          :style="imageUrl ? `background-image: url(${imageUrl}/128x128)` : ''"
          @click="selectAvatar()">
          <div
            class="flex flex-col gap-2 w-full h-full items-center justify-center p-4"
            v-if="!imageUrl">
            <div class="lt-md:(w-[24px] h-[24px]) w-[32px] h-[32px]">
              <Icon
                :name="
                  uploadLoading ? 'svg-spinners:3-dots-fade' : 'ph-image-square'
                "
                size="100%" />
            </div>
            <p class="text-center text-sm lt-md:text-xs">Upload image</p>
          </div>
        </button>

        <div
          v-if="fNameValue || lNameValue"
          class="font-display lt-md:text-2xl md:text-3xl flex flex-col">
          <p>{{ fNameValue }}</p>
          <p>{{ lNameValue }}</p>
        </div>
      </div>
      <div
        class="grid lt-md:grid-rows-2 md:grid-cols-2 gap-4 items-center w-full">
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
      <div class="mt-3 w-full flex lt-md:flex-col-reverse md:flex-row gap-4">
        <UnUiButton
          label="skip"
          icon="ph-skip-forward"
          variant="outline"
          width="full"
          @click="navigateTo('join/org')" />
        <UnUiButton
          :label="buttonLabel"
          icon="ph-user"
          :loading="buttonLoading"
          :disabled="!formValid"
          width="full"
          @click="createUserProfile()" />
      </div>
      <p
        v-if="pageError"
        class="p-4 w-full text-center rounded bg-red-9">
        Something went wrong, please try again or contact our support team if it
        persists
      </p>
    </div>
  </div>
</template>
