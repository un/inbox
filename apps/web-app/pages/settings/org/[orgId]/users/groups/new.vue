<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { UiColor } from '@uninbox/types/ui';
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

  const route = useRoute();

  const orgPublicId = route.params.orgId as string;

  async function createGroup() {
    if (!newGroupColorValue.value) return;
    buttonLoading.value = true;
    buttonLabel.value = 'Creating...';
    const { newGroupPublicId } =
      await $trpc.org.users.userGroups.createOrgUserGroups.mutate({
        orgPublicId,
        groupName: newGroupNameValue.value,
        groupDescription: newGroupDescriptionValue.value,
        groupColor: newGroupColorValue.value
      });
    buttonLoading.value = false;
    buttonLabel.value = 'Done... Redirecting';
    setTimeout(() => {
      navigateTo(
        `/settings/org/${orgPublicId}/users/groups/${newGroupPublicId}/?new=true`
      );
    }, 1500);
  }

  const canAddUserGroup = ref<boolean | null | undefined>(null);
  const canAddUserGroupAllowedPlans = ref<string[]>();
  const dataPending = ref(true);

  if (useEE().config.modules.billing) {
    dataPending.value = true;
    console.log('checking if can use feature');
    const { data: canUseFeature } =
      await $trpc.org.setup.billing.canUseFeature.useLazyQuery(
        {
          orgPublicId: orgPublicId,
          feature: 'userGroups'
        },
        { server: false }
      );

    canAddUserGroup.value = canUseFeature.value?.canUse;
    canAddUserGroupAllowedPlans.value = canUseFeature.value?.allowedPlans;
    dataPending.value = false;
  } else {
    dataPending.value = false;
    canAddUserGroup.value = true;
  }
</script>

<template>
  <div class="h-full w-full flex flex-col items-start gap-8 p-4">
    <div class="w-full flex flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-4">
        <UnUiTooltip text="Back to domains">
          <icon
            name="ph-arrow-left"
            size="32"
            @click="navigateTo('./')" />
        </UnUiTooltip>
        <div class="flex flex-col gap-1">
          <span class="text-2xl font-display">Add a new Group</span>
        </div>
      </div>
    </div>
    <div
      v-if="dataPending"
      class="w-full flex flex-row justify-center gap-4 rounded-xl rounded-tl-2xl bg-base-3 p-8">
      <icon
        name="svg-spinners:3-dots-fade"
        size="24" />
      <span>Checking groups</span>
    </div>
    <div
      v-if="!dataPending && !canAddUserGroup"
      class="w-full flex flex-col gap-4">
      <span>
        Sorry, your current billing plan does not support adding user groups.
      </span>
      <span>Supported plans are: {{ canAddUserGroupAllowedPlans }}</span>
    </div>
    <div
      v-if="!dataPending && canAddUserGroup"
      class="flex flex-col gap-4">
      <UnUiInput
        v-model:value="newGroupNameValue"
        v-model:valid="newGroupNameValid"
        label="Group Name"
        :schema="z.string().min(2)" />
      <UnUiInput
        v-model:value="newGroupDescriptionValue"
        label="Description"
        :schema="z.string().optional()" />
      <div class="flex flex-col gap-1">
        <span class="text-sm">Group Color</span>
        <div class="flex flex-row gap-2">
          <div
            class="h-8 w-8 cursor-pointer rounded bg-red-9 p-1 text-white"
            @click="newGroupColorValue = 'red'">
            <icon
              v-if="newGroupColorValue === 'red'"
              name="ph:check-bold"
              size="24" />
          </div>
          <div
            class="h-8 w-8 cursor-pointer rounded bg-pink-9 p-1 text-white"
            @click="newGroupColorValue = 'pink'">
            <icon
              v-if="newGroupColorValue === 'pink'"
              name="ph:check-bold"
              size="24" />
          </div>
          <div
            class="h-8 w-8 cursor-pointer rounded bg-purple-9 p-1 text-white"
            @click="newGroupColorValue = 'purple'">
            <icon
              v-if="newGroupColorValue === 'purple'"
              name="ph:check-bold"
              size="24" />
          </div>
          <div
            class="h-8 w-8 cursor-pointer rounded bg-blue-9 p-1 text-white"
            @click="newGroupColorValue = 'blue'">
            <icon
              v-if="newGroupColorValue === 'blue'"
              name="ph:check-bold"
              size="24" />
          </div>
          <div
            class="h-8 w-8 cursor-pointer rounded bg-cyan-9 p-1 text-white"
            @click="newGroupColorValue = 'cyan'">
            <icon
              v-if="newGroupColorValue === 'cyan'"
              name="ph:check-bold"
              size="24" />
          </div>
          <div
            class="h-8 w-8 cursor-pointer rounded bg-green-9 p-1 text-white"
            @click="newGroupColorValue = 'green'">
            <icon
              v-if="newGroupColorValue === 'green'"
              name="ph:check-bold"
              size="24" />
          </div>
          <div
            class="h-8 w-8 cursor-pointer rounded bg-orange-9 p-1 text-white"
            @click="newGroupColorValue = 'orange'">
            <icon
              v-if="newGroupColorValue === 'orange'"
              name="ph:check-bold"
              size="24" />
          </div>
          <div
            class="h-8 w-8 cursor-pointer rounded bg-yellow-9 p-1 text-white"
            @click="newGroupColorValue = 'yellow'">
            <icon
              v-if="newGroupColorValue === 'yellow'"
              name="ph:check-bold"
              size="24" />
          </div>
        </div>
      </div>

      <UnUiButton
        icon="ph:plus"
        :label="buttonLabel"
        :loading="buttonLoading"
        :disabled="!formValid"
        @click="createGroup()" />
    </div>
  </div>
</template>
