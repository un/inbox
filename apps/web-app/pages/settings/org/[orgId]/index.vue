<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { z } from 'zod';
  import { useFileDialog } from '@vueuse/core';
  const { $trpc, $i18n } = useNuxtApp();
  const uploadLoading = ref(false);
  const buttonLoading = ref(false);
  const buttonLabel = ref('Save profile');
  const pageError = ref(false);
  const imageUrl = ref<string | null>();
  const imageId = ref<string | null>();
  const orgNameValid = ref<boolean | 'remote' | null>(null);
  const orgNameValue = ref('');
  const orgNameValidationMessage = ref('');

  const orgPublicId = useRoute().params.orgId as string;

  const { data: initialOrgProfile, pending } =
    await $trpc.org.profile.getOrgProfile.useLazyQuery({
      orgPublicId: orgPublicId
    });

  if (initialOrgProfile.value && initialOrgProfile.value.orgProfile) {
    orgNameValue.value = initialOrgProfile.value.orgProfile?.name;
    initialOrgProfile.value.orgProfile?.avatarId
      ? (imageUrl.value = `https://imagedelivery.net/${
          useRuntimeConfig().public.cfImagesAccountHash
        }/${initialOrgProfile.value.orgProfile?.avatarId}`)
      : null;
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

  const { data: imageUploadSignedUrl, pending: imageUploadSignedUrlPending } =
    await $trpc.user.profile.generateAvatarUploadUrl.useLazyQuery();

  const formValid = computed(() => {
    if (imageId.value) return true;
    if (orgNameValue.value !== initialOrgProfile.value?.orgProfile?.name) {
      return orgNameValid.value === true;
    }
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
    if (imageUploadSignedUrl.value) {
      await useFetch(imageUploadSignedUrl.value.uploadURL, {
        method: 'post',
        body: formData
      });
      imageId.value = await $trpc.user.profile.awaitAvatarUpload.query({
        uploadId: imageUploadSignedUrl.value.id
      });
    }
    //TODO: make the image only appear once it has been loaded to avoid blank box
    imageUrl.value = `https://imagedelivery.net/${
      useRuntimeConfig().public.cfImagesAccountHash
    }/${imageId.value}`;
    uploadLoading.value = false;
  });

  async function saveProfile() {
    buttonLoading.value = true;
    buttonLabel.value = 'Saving...';
    const newOrgAvatarId = imageId.value ? imageId.value : null;

    const response = await $trpc.org.profile.setOrgProfile.mutate({
      orgPublicId: orgPublicId,
      orgName: orgNameValue.value,
      ...(imageId.value && { orgAvatarId: imageId.value })
    });

    if (!response.success) {
      pageError.value = true;
      buttonLoading.value = false;
      buttonLabel.value = 'Save profile';
      return;
    }
    buttonLoading.value = false;
    buttonLabel.value = 'All done!';
  }
</script>

<template>
  <div class="flex flex-col w-full h-full items-start p-4 gap-8">
    <div class="flex flex-row w-full justify-between items-center">
      <span class="font-display text-2xl">Organization Profile</span>
    </div>
    <div
      v-if="pending"
      class="flex flex-row w-full p-8 bg-base-3 rounded-xl gap-4 justify-center rounded-tl-2xl">
      <icon
        name="svg-spinners:3-dots-fade"
        size="24" />
      <span>Loading organization profile</span>
    </div>
    <div
      class="flex flex-col items-start justify-center gap-8 w-full pb-14"
      v-if="!pending">
      <div class="flex flex-col gap-2">
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
        <button
          class="flex flex-row gap-1 w-full items-center justify-start"
          v-if="imageUrl"
          @click="selectAvatar()">
          <div class="w-[24px] h-[24px]">
            <Icon
              :name="
                uploadLoading ? 'svg-spinners:3-dots-fade' : 'ph-image-square'
              "
              size="100%" />
          </div>
          <span class="text-center text-sm lt-md:text-xs"
            >Upload new image</span
          >
        </button>
      </div>

      <UnUiInput
        v-model:value="orgNameValue"
        v-model:valid="orgNameValid"
        v-model:validationMessage="orgNameValidationMessage"
        label="Organisation Name"
        placeholder=""
        :locked="true"
        :schema="z.string().min(1)" />
      <UnUiButton
        :label="buttonLabel"
        icon="ph-floppy-disk"
        :loading="buttonLoading"
        :disabled="!formValid"
        @click="saveProfile()" />
      <p
        v-if="pageError"
        class="p-4 w-full text-center rounded bg-red-9">
        Something went wrong, please try again or contact our support team if it
        persists
      </p>
    </div>
  </div>
</template>
