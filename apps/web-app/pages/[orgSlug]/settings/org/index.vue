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
    await $trpc.org.setup.profile.getOrgProfile.useLazyQuery(
      {
        orgPublicId: orgPublicId
      },
      { server: false }
    );

  watch(
    initialOrgProfile,
    (newVal) => {
      if (newVal && newVal.orgProfile) {
        orgNameValue.value = newVal.orgProfile.name;
        newVal.orgProfile.avatarId
          ? ((imageUrl.value = useUtils().generateAvatarUrl(
              newVal.orgProfile.avatarId,
              '128x128'
            )) as string)
          : null;
      }
    }
    // ,
    // { immediate: true }
  );

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
    execute: getUploadUrl,
    refresh: getUploadUrlRefresh
  } = await $trpc.user.profile.generateAvatarUploadUrl.useLazyQuery(void null, {
    server: false,
    immediate: false
  });

  const formValid = computed(() => {
    if (imageId.value) return true;
    if (orgNameValue.value !== initialOrgProfile.value?.orgProfile?.name) {
      return orgNameValid.value === true;
    }
  });

  //functions
  async function selectAvatar() {
    await getUploadUrl();
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
    if (imageId.value) {
      imageUrl.value = useUtils().generateAvatarUrl(
        imageId.value,
        '128x128'
      ) as string;
    }
    uploadLoading.value = false;
  });

  async function saveProfile() {
    buttonLoading.value = true;
    buttonLabel.value = 'Saving...';
    const newOrgAvatarId = imageId.value ? imageId.value : null;

    const response = await $trpc.org.setup.profile.setOrgProfile.mutate({
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
    const toast = useToast();
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
  <div class="h-full w-full flex flex-col items-start gap-8 p-4">
    <div class="w-full flex flex-row items-center justify-between">
      <span class="text-2xl font-display">Organization Profile</span>
    </div>
    <div
      v-if="pending"
      class="w-full flex flex-row justify-center gap-4 rounded-xl rounded-tl-2xl bg-base-3 p-8">
      <UnUiIcon
        name="i-svg-spinners:3-dots-fade"
        size="24" />
      <span>Loading organization profile</span>
    </div>
    <div
      v-if="!pending"
      class="w-full flex flex-col items-start justify-center gap-8 pb-14">
      <div class="flex flex-col gap-2">
        <button
          type="button"
          class="h-[80px] w-[80px] cursor-pointer border-1 border-base-7 rounded-lg bg-base-3 bg-cover bg-center md:h-[128px] md:w-[128px] hover:border-base-8 hover:bg-base-4"
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
        icon="i-ph-floppy-disk"
        :loading="buttonLoading"
        :disabled="!formValid"
        @click="saveProfile()" />
      <p
        v-if="pageError"
        class="w-full rounded bg-red-9 p-4 text-center">
        Something went wrong, please try again or contact our support team if it
        persists
      </p>
    </div>
  </div>
</template>
