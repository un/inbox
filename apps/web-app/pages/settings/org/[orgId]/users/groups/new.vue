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
      await $trpc.org.userGroups.createOrgUserGroups.mutate({
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
</script>

<template>
  <div class="flex flex-col w-full h-full items-start p-4 gap-8">
    <div class="flex flex-row w-full justify-between items-center">
      <div class="flex flex-row gap-4 items-center">
        <UnUiTooltip text="Back to domains">
          <icon
            name="ph-arrow-left"
            size="32"
            @click="navigateTo('./')" />
        </UnUiTooltip>
        <div class="flex flex-col gap-1">
          <span class="font-display text-2xl">Add a new Group</span>
        </div>
      </div>
    </div>
    <div class="flex flex-col gap-4">
      <UnUiInput
        label="Group Name"
        :schema="z.string().min(2)"
        v-model:value="newGroupNameValue"
        v-model:valid="newGroupNameValid" />
      <UnUiInput
        label="Description"
        :schema="z.string().optional()"
        v-model:value="newGroupDescriptionValue" />
      <div class="flex flex-col gap-1">
        <span class="text-sm">Group Color</span>
        <div class="flex flex-row gap-2">
          <div
            class="w-8 h-8 bg-red-9 cursor-pointer rounded text-white p-1"
            @click="newGroupColorValue = 'red'">
            <icon
              name="ph:check-bold"
              size="24"
              v-if="newGroupColorValue === 'red'" />
          </div>
          <div
            class="w-8 h-8 bg-pink-9 cursor-pointer rounded text-white p-1"
            @click="newGroupColorValue = 'pink'">
            <icon
              name="ph:check-bold"
              size="24"
              v-if="newGroupColorValue === 'pink'" />
          </div>
          <div
            class="w-8 h-8 bg-purple-9 cursor-pointer rounded text-white p-1"
            @click="newGroupColorValue = 'purple'">
            <icon
              name="ph:check-bold"
              size="24"
              v-if="newGroupColorValue === 'purple'" />
          </div>
          <div
            class="w-8 h-8 bg-blue-9 cursor-pointer rounded text-white p-1"
            @click="newGroupColorValue = 'blue'">
            <icon
              name="ph:check-bold"
              size="24"
              v-if="newGroupColorValue === 'blue'" />
          </div>
          <div
            class="w-8 h-8 bg-cyan-9 cursor-pointer rounded text-white p-1"
            @click="newGroupColorValue = 'cyan'">
            <icon
              name="ph:check-bold"
              size="24"
              v-if="newGroupColorValue === 'cyan'" />
          </div>
          <div
            class="w-8 h-8 bg-green-9 cursor-pointer rounded text-white p-1"
            @click="newGroupColorValue = 'green'">
            <icon
              name="ph:check-bold"
              size="24"
              v-if="newGroupColorValue === 'green'" />
          </div>
          <div
            class="w-8 h-8 bg-orange-9 cursor-pointer rounded text-white p-1"
            @click="newGroupColorValue = 'orange'">
            <icon
              name="ph:check-bold"
              size="24"
              v-if="newGroupColorValue === 'orange'" />
          </div>
          <div
            class="w-8 h-8 bg-yellow-9 cursor-pointer rounded text-white p-1"
            @click="newGroupColorValue = 'yellow'">
            <icon
              name="ph:check-bold"
              size="24"
              v-if="newGroupColorValue === 'yellow'" />
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
