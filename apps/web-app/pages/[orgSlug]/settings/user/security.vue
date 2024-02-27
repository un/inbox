<script setup lang="ts">
  import { z } from 'zod';
  import { useFileDialog } from '@vueuse/core';
  import type { RegistrationResponseJSON } from '@simplewebauthn/types';
  import { startRegistration } from '@simplewebauthn/browser';
  const { $trpc, $i18n } = useNuxtApp();
  const uploadLoading = ref(false);
  const buttonLoading = ref(false);
  const buttonLabel = ref('Save Changes');
  // const verifybuttonLabel = ref('Verify');
  const pageError = ref(false);
  const rEmailValid = ref<boolean | 'remote' | null>(null);
  const rEmailValue = ref('');
  const isPassword = ref();
  const isrEmailVerified = ref();
  const isPasskey = ref();
  const cpasswordValid = ref<boolean | 'remote' | null>(null);
  const cpasswordValue = ref('');
  const cpasswordMatch = ref();
  const npasswordValid = ref<boolean | 'remote' | null>(null);
  const npasswordValue = ref('');
  const nickName = ref('');
  const nickNameValid = ref<boolean | 'remote' | null>(null);
   const passkeysData = ref([]);
  const canUsePasskeyDirect =
    await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    const editModalOpen = ref(false);
  const closeEditModal = () => {
    editModalOpen.value = false;
    refresh();
  };
  const removeModalOpen = ref(false);
  const closeRemoveModal = () => {
    removeModalOpen.value = false;
    refresh();
  };

  const { data: initialUserProfile, pending } =
    await $trpc.auth.security.getCredentials.useLazyQuery();
    watch(
    initialUserProfile,
    (newVal) => {
      if (newVal && newVal.profile) {
        rEmailValue.value = newVal.profile.recoveryEmail,
        isPassword.value = newVal.profile.passwordEnabled,
        isPasskey.value=newVal.profile.passkeysEnabled;
        // isEmailVerified.value=newVal.profile.emailVerified;

      }
    }
  );

  const {data :passkeysArray,refresh} =
    await $trpc.auth.passkey.getPasskeyInfo.useLazyQuery();

    watch(
    passkeysArray,
    (newVal) => {
      // console.log(data);
      if (newVal && newVal.data) {
        passkeysData.value = newVal.data;

      }
    }
  );

  async function save() {
    const toast = useToast();
    buttonLoading.value = true;
    buttonLabel.value = 'Saving...';

    const updateAccount =
      $trpc.auth.security.updateCredentials.useMutation();
    await updateAccount.mutate({
        passwordEnabled: isPassword.value,
        recoveryEmail: rEmailValue.value,
        // emailVerified: isEmailVerified.value,
        passkeysEnabled: isPasskey.value,
    });

    if (updateAccount.status.value === 'error') {
      cpasswordMatch.value = false;
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

  async function verifyEmail(){
    isrEmailVerified.value = !isrEmailVerified.value;
    }

  async function saveNickname(credentialId:Uint8Array){ 
    const toast = useToast();
    const isSuccess =
      await $trpc.auth.passkey.renamePasskey.useLazyQuery({
        cred: credentialId,
        nickname: nickName.value
      });
      if(!isSuccess.data.value.success){
        toast.add({
        id: 'passkey_error',
        title: 'Passkey error',
        description:
          'Something went wrong when creating your passkey, please try again or switch to password mode.',
        color: 'red',
        timeout: 5000,
        icon: 'i-ph-warning-circle'
      });
      return;
      }
      closeEditModal();
      toast.add({
      id: 'profile_saved',
      title: 'Profile Saved',
      description: 'Profile has been updated successfully',
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    }); 
    refresh();
  }

  async function removePasskey(credentialId:Uint8Array){
    const toast = useToast();
    const isSuccess =
      await $trpc.auth.passkey.deletePasskey.useLazyQuery({
        cred: credentialId
      });
      if(!isSuccess.data.value.success){
        toast.add({
        id: 'passkey_error',
        title: 'Passkey error',
        description:
          'Something went wrong when creating your passkey, please try again or switch to password mode.',
        color: 'red',
        timeout: 5000,
        icon: 'i-ph-warning-circle'
      });
      return;
      }
      closeRemoveModal();
      toast.add({
      id: 'profile_saved',
      title: 'Profile Saved',
      description: 'Profile has been updated successfully',
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    }); 
    refresh();
  
  }

  async function addPasskey(){
    const toast = useToast();
    const passkeyOptions =
      await $trpc.auth.passkey.generateNewPasskeyChallenge.query({
        canUsePasskeyDirect: canUsePasskeyDirect
      });
      let newPasskeyData: RegistrationResponseJSON;
    try {
      newPasskeyData = await startRegistration(passkeyOptions.options);
    } catch (error) {
      toast.add({
        id: 'passkey_error',
        title: 'Passkey error',
        description:
          'Something went wrong when creating your passkey, please try again or switch to password mode.',
        color: 'red',
        timeout: 5000,
        icon: 'i-ph-warning-circle'
      });
      buttonLoading.value = false;
      buttonLabel.value = 'Try Again!';
      return;
    }
    const verifyNewPasskey = await $trpc.auth.passkey.addNewPasskey.mutate({
        registrationResponseRaw: newPasskeyData,
        nickname: 'Primary'
      });
      isPasskey.value = true;
      refresh();
      //must save changes , for it to reflect the next time user comes on this page
      if (!verifyNewPasskey.success) {
        toast.add({
          id: 'passkey_error',
          title: 'Passkey error',
          description:
            'Something went wrong when creating your passkey, please try again or switch to password mode.',
          color: 'red',
          timeout: 5000,
          icon: 'i-ph-warning-circle'
        });
        buttonLoading.value = false;
        buttonLabel.value = 'Try Again!';
        return;
      }

  }

  async function savePassword() {
    const toast = useToast();
    buttonLoading.value = true;
    buttonLabel.value = 'Saving...';

    // if (!initialUserProfile.value?.profile?.publicId) {
    //   pageError.value = true;
    //   buttonLoading.value = false;
    //   buttonLabel.value = 'Save profile';
    //   return;
    // }
    const checkPassword =
      $trpc.auth.security.checkPassword.useMutation();
    await checkPassword.mutate({
      password: cpasswordValue.value
    });

    if (checkPassword.status.value === 'error') {
      cpasswordMatch.value = false;
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

    const setPassword =
      $trpc.auth.security.setPassword.useMutation();
    await setPassword.mutate({
      password: npasswordValue.value
    });

    cpasswordMatch.value =true;
    buttonLoading.value = false;
    buttonLabel.value = 'All done!';
    // refreshNuxtData('getUserSingleProfileNav');
    toast.add({
      id: 'profile_saved',
      title: 'Profile Saved',
      description: 'Profile has been updated successfully',
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    });
  }
  function formatDate(dateString:string) {
  const date = new Date(dateString);
  return date.toDateString();
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
      class="w-full flex flex-col gap-14">
      <hr class="line dark:border-gray-600 border-gray-300 border-t">
      <div class="flex flex-row">
        <div class="text-1xl basis-1/2 font-display">
          Change Recovery Email
        </div>
        <div class="flex basis-1/2 flex-col gap-4">
          <UnUiInput
          v-model:value="rEmailValue"
          v-model:valid="rEmailValid"
          icon="ph:envelope"
          class="w-3/4 text-sm font-display"
          label="Recovery email address"
          helper="This email will only be used if you ever lose all your passkeys and need to recover your account or for important account notices."
          placeholder=""
          :schema="z.string().trim().email()" />
          <!-- add :remote-validation:true -->

          <UnUiButton
          :label="isrEmailVerified ? 'Verified' : 'Verify'"
          icon="i-ph-key"
          :loading="buttonLoading"
          block
          class="w-1/6"
          :disabled="isrEmailVerified"
          @click="verifyEmail()"
           />
           <UnUiButton
          label="Save"
          icon="i-ph-floppy-disk"
          :loading="buttonLoading"
          block
          class="w-1/6"
          @click="save()"
           />
        </div>
      </div>
      <hr class="line dark:border-gray-600 border-gray-300 border-t">

      <div class="flex">
        <div class="text-1xl basis-1/2 font-display">
          Change Password
        </div>
        <div class="flex basis-1/2 flex-col gap-4">
          <UnUiInput
              v-model:value="cpasswordValue"
              v-model:valid="cpasswordValid"

              icon="i-ph-password"
              class="text-sm font-display"
              label="Current Password"
              password
              placeholder=""
              :schema="
                z
                  .string()
                  .min(8, { message: 'Minimum 8 characters' })
                  .max(64)
                  .regex(
                    /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.*\s).{8,}$/,
                    {
                      message:
                        'At least one digit, one lowercase letter, one uppercase letter, one special character, no whitespace allowed, minimum eight characters in length'
                    }
                  )
              " />
       <UnUiInput
              v-model:value="npasswordValue"
              v-model:valid="npasswordValid"
              class="text-sm font-display"
              icon="i-ph-password"
              label="New Password"
              password
              placeholder=""
              :schema="
                z
                  .string()
                  .min(8, { message: 'Minimum 8 characters' })
                  .max(64)
                  .regex(
                    /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.*\s).{8,}$/,
                    {
                      message:
                        'At least one digit, one lowercase letter, one uppercase letter, one special character, no whitespace allowed, minimum eight characters in length'
                    }
                  )
              " />

          <UnUiButton
            :label="buttonLabel"
            icon="i-ph-floppy-disk"
            block
            class="w-1/4"
            :disabled="!cpasswordValue || !npasswordValue"
            @click="savePassword()"
           />

            <div class="gap-4 text-sm font-sans">
              <p class="text-sm font-display">
                Turn Off Password
              </p>
              <div class="flex gap-4">
        <span>
            Can Only be done if Passkeys are on
        </span>

          <UnUiToggle
         v-model="isPassword"
         :disabled="!isPasskey"
         />


        </div>
            </div>
        </div>

      </div>
      <hr class="line dark:border-gray-600 border-gray-300 border-t">
      <div class="flex">
        <div class="text-1xl basis-1/2 font-display">
          Authentication
        </div>
        <div class="flex basis-1/2 flex-col gap-4">
          <span class="basis-1/2 text-sm font-display">Two Factor Authentication</span>
          <!-- <UnUiButton
            label="Change My Password"
            icon="i-ph-password"
            block
            size="lg"
            block
          class="w-1/6"
            @click="passwordButton()" /> -->
            <div class="gap-4 text-sm font-sans">
              <p class="text-sm font-display">
                Passkeys
              </p>
              <div class="flex gap-4">
                <span>
                  Setup a More Secure Way of Authentication
                </span>
              </div>

            </div>
            <UnUiButton
                label="Add a Passkey"
                icon="i-ph-key"
                block
                class="w-1/4"
                :loading="buttonLoading"
                @click="addPasskey()" />
              <!-- loop over the sessions -->
              <div v-if="passkeysData">
                <hr class="line dark:border-gray-600 border-gray-300 w-3/4 border-t">
            <div v-for="(passkey, index) in passkeysData"  :key="index"  class="flex flex-row gap-2 text-sm font-sans" >
              <span  class="basis-1/2" >
                <p> {{ passkey.nickname }}</p>
                <p>{{ formatDate(passkey.createdAt) }}</p>
              </span>
              <div class="flex flex-row items-center gap-4">
                <UnUiButton
                  label="Edit"
                  @click="editModalOpen = true" />
                <UnUiModal v-model="editModalOpen">
                  <template #header>
                    <span class="">Edit</span>
                  </template>
                  <UnUiInput
                    v-model:value="nickName"
                    v-model:valid="nickNameValid"
                    label="Enter New Nickname"
                    :schema="
                      z
                        .string()
                        .min(1)
                        .max(16)
                        .regex(/^[a-zA-Z0-9]*$/, {
                          message: 'Only letters and numbers'
                        })
                    "
                    width="full" />
                    <UnUiButton 
                    label="Save"
                    @click="saveNickname(passkey.credentialID)"
                    />
                  </UnUiModal>
                  </div>
                  <div class="flex flex-row items-center gap-4">
                    <UnUiButton
                      label="Remove"
                      @click="removeModalOpen = true" />
                    <UnUiModal v-model="removeModalOpen">
                      <template #header>
                        <span class="">Are You Sure, You want to remove it </span>
                      </template>
                      <div class ="flex flex-col">
                        <span class="p-2">
                          Are you Sure You want to remove it? Type <span class="text-sm">"{{ passkey.nickname }}"</span>
                        </span>
                      <UnUiButton
                      label="Remove"
                      class="w-1/4 text-center"
                        @click="removePasskey(passkey.credentialID)"
                      />
                      </div>
                      
                    </UnUiModal>
                  </div>
                        </div>
                        <hr class="line dark:border-gray-600 border-gray-300 w-3/4 border-t">
                    </div>

              </div>
                  </div>
                
                  <UnUiButton
                    :label="buttonLabel"
                    icon="i-ph-floppy-disk"
                    :loading="buttonLoading"
                    block
                    class="w-1/4"
                    @click="savePassword()" />
                  <p
                    v-if="pageError"
                    class="w-full rounded bg-red-9 p-4 text-center">
                    Something went wrong, please try again or contact our support team if it
                    persists
                  </p>
                </div>
  </div>
</template>
