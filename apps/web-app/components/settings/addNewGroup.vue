<script setup lang="ts">
  import type { UiColor } from '@uninbox/types/ui';
  import { z } from 'zod';
  const { $trpc, $i18n } = useNuxtApp();

  const newGroupNameValue = ref('');
  const newGroupNameValid = ref<boolean | 'remote' | null>(null);
  const newGroupColorValue = ref<UiColor>();
  const newGroupDescriptionValue = ref('');
  const buttonLabel = ref('Create New Group');
  const buttonLoading = ref(false);

  const formValid = computed(() => {
    return newGroupNameValid.value === true && !!newGroupColorValue.value;
  });

  const emit = defineEmits(['close']);

  const route = useRoute();

  const orgSlug = route.params.orgSlug as string;

  async function createGroup() {
    if (!newGroupColorValue.value) return;
    buttonLoading.value = true;
    buttonLabel.value = 'Creating...';
    const { newGroupPublicId } =
      await $trpc.org.users.userGroups.createOrgUserGroups.mutate({
        groupName: newGroupNameValue.value,
        groupDescription: newGroupDescriptionValue.value,
        groupColor: newGroupColorValue.value
      });
    buttonLoading.value = false;
    buttonLabel.value = 'Done... Redirecting';
    const toast = useToast();
    toast.add({
      id: 'group_xreated',
      title: 'Group Group Created',
      description: 'Group has been created successfully',
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    });
    setTimeout(() => {
      emit('close');
    }, 1000);
  }

  const dataPending = ref(true);

  const isPro = ref(false);
  if (useEE().config.modules.billing) {
    const { data: isProQuery, pending } =
      await $trpc.org.setup.billing.isPro.useLazyQuery({}, { server: false });

    isPro.value = isProQuery.value?.isPro || false;
    dataPending.value = pending.value;
  } else {
    isPro.value = true;
  }
</script>

<template>
  <div class="h-full w-full flex flex-col items-start">
    <div
      v-if="dataPending"
      class="w-full flex flex-row justify-center gap-4 rounded-xl rounded-tl-2xl bg-base-3 p-8">
      <UnUiIcon
        name="i-svg-spinners:3-dots-fade"
        size="24" />
      <span>Checking status</span>
    </div>
    <div
      v-if="!dataPending && !isPro"
      class="flex flex-col gap-4">
      <span>
        Sorry, your current billing plan does not support adding user groups.
      </span>
      <div>
        <UnUiButton
          icon="i-ph-credit-card"
          label="Go to billing"
          @click="navigateTo(`/${orgSlug}/settings/org/setup/billing`)" />
      </div>
    </div>
    <div
      v-if="!dataPending && isPro"
      class="w-full flex flex-col gap-4">
      <div
        class="grid grid-cols-1 grid-rows-2 w-full gap-4 md:grid-cols-2 md:grid-rows-1">
        <UnUiInput
          v-model:value="newGroupNameValue"
          v-model:valid="newGroupNameValid"
          label="Group Name"
          :schema="z.string().min(2)"
          width="full" />
        <UnUiInput
          v-model:value="newGroupDescriptionValue"
          label="Description"
          :schema="z.string().optional()"
          width="full" />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm">Group Color</span>
        <div class="flex flex-row gap-2">
          <div
            class="bg-red-500 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newGroupColorValue = 'red'">
            <UnUiIcon
              v-if="newGroupColorValue === 'red'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-pink-500 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newGroupColorValue = 'pink'">
            <UnUiIcon
              v-if="newGroupColorValue === 'pink'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-purple-500 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newGroupColorValue = 'purple'">
            <UnUiIcon
              v-if="newGroupColorValue === 'purple'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-blue-500 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newGroupColorValue = 'blue'">
            <UnUiIcon
              v-if="newGroupColorValue === 'blue'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-cyan-500 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newGroupColorValue = 'cyan'">
            <UnUiIcon
              v-if="newGroupColorValue === 'cyan'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-green-500 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newGroupColorValue = 'green'">
            <UnUiIcon
              v-if="newGroupColorValue === 'green'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-orange-500 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newGroupColorValue = 'orange'">
            <UnUiIcon
              v-if="newGroupColorValue === 'orange'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-yellow-500 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newGroupColorValue = 'yellow'">
            <UnUiIcon
              v-if="newGroupColorValue === 'yellow'"
              name="i-ph-check-bold"
              size="24" />
          </div>
        </div>
      </div>

      <UnUiButton
        icon="i-ph-plus"
        :label="buttonLabel"
        :loading="buttonLoading"
        :disabled="!formValid"
        @click="createGroup()" />
    </div>
  </div>
</template>
