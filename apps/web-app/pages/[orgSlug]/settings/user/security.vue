<script setup lang="ts">
  import { z } from 'zod';
  import { useFileDialog } from '@vueuse/core';
  const { $trpc, $i18n } = useNuxtApp();
  const uploadLoading = ref(false);
  const buttonLoading = ref(false);
  const buttonLabel = ref('Save Changes');
  const verifybuttonLabel = ref('Verify');
  const pageError = ref(false);
  const fNameValid = ref<boolean | 'remote' | null>(null);
  const fNameValue = ref('');
  const fNameValidationMessage = ref('');
  const lNameValid = ref<boolean | 'remote' | null>(null);
  const lNameValue = ref('');
  const lNameValidationMessage = ref('');

  const orgSlug = useRoute().params.orgSlug as string;

  // const { data: initialUserProfile, pending } =
  //   await $trpc.user.profile.getUserOrgProfile.useLazyQuery(
  //     { orgSlug: orgSlug },
  //     { server: false }
  //   );

  // watch(
  //   initialUserProfile,
  //   (newVal) => {
  //     if (newVal && newVal.profile) {
  //       fNameValue.value = newVal.profile.firstName || '';
  //       lNameValue.value = newVal.profile.lastName || '';
  //     }
  //   }
    // ,
    // { immediate: true }
  // );
  const { data: initialUserProfile, pending } =
    await $trpc.auth.security.getUserOrgProfile.useLazyQuery();

    watch(
    initialUserProfile,
    (newVal) => {
      if (newVal && newVal.profile) {
        fNameValue.value = newVal.profile.recoveryEmail || '';
      }
    }
    // ,
    // { immediate: true }
  );

  async function saveProfile() {
    const toast = useToast();
    buttonLoading.value = true;
    buttonLabel.value = 'Saving...';

    if (!initialUserProfile.value?.profile?.publicId) {
      pageError.value = true;
      buttonLoading.value = false;
      buttonLabel.value = 'Save profile';
      return;
    }
    const updateUserProfileTrpc =
      $trpc.auth.signup.registerUser.useMutation();
    // await updateUserProfileTrpc.mutate();

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
    refreshNuxtData('getUserSingleProfileNav');
    toast.add({
      id: 'profile_saved',
      title: 'Profile Saved',
      description: 'Profile has been updated successfully',
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    });
  }

  async function verify() {
    const toast = useToast();
    buttonLoading.value = true;
    buttonLabel.value = 'Saving...';

    if (!initialUserProfile.value?.profile?.publicId) {
      pageError.value = true;
      buttonLoading.value = false;
      buttonLabel.value = 'Save profile';
      return;
    }
    const updateUserProfileTrpc =
      $trpc.user.profile.updateUserProfile.useMutation();
    // await updateUserProfileTrpc.mutate({
    //   profilePublicId: initialUserProfile.value.profile.publicId,
    //   fName: fNameValue.value,
    //   lName: lNameValue.value,
    //   handle: initialUserProfile.value.profile.handle || ''
    // });

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
    refreshNuxtData('getUserSingleProfileNav');
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
      <span class="text-2xl font-display">Security Settings</span>
    </div>
    <div
      v-if="pending"
      class="w-full flex flex-row justify-center gap-4 rounded-xl rounded-tl-2xl bg-base-3 p-8">
      <UnUiIcon
        name="i-svg-spinners:3-dots-fade"
        size="24" />
      <span>Loading your profiles</span>
    </div>
    <div
      v-if="!pending"
      class="w-full flex flex-col items-start justify-center gap-8 pb-14">
      
      <div class="flex flex-row flex-wrap gap-4">
          <UnUiInput
          v-model:value="fNameValue"
          v-model:valid="fNameValid"
          
          width="full"
          icon="ph:envelope"
          label="Recovery email address"
          helper="This email will only be used if you ever lose all your passkeys and need to recover your account or for important account notices."
          placeholder=""
          :remote-validation="true"
          :schema="z.string().trim().email()" />

          <UnUiButton
          :label="verifybuttonLabel"
          icon="i-ph-key"
          :loading="buttonLoading"
          block
          @click="verify()" />
      </div>

      
      <div class="flex flex-row flex-wrap gap-4">
          <UnUiInput
          v-model:value="fNameValue"
          v-model:valid="fNameValid"
          label="Password"
          :schema="z.string().trim()"
          placeholder="" />
      </div>
      <UnUiButton
        :label="buttonLabel"
        icon="i-ph-floppy-disk"
        :loading="buttonLoading"
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
