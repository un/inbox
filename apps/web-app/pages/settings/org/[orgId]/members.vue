<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { z } from 'zod';
  const { $trpc, $i18n } = useNuxtApp();
  const uploadLoading = ref(false);
  const buttonLoading = ref(false);
  const buttonLabel = ref('Save profile');
  const pageError = ref(false);
  const orgNameValid = ref<boolean | 'remote' | null>(null);
  const orgNameValue = ref('');
  const orgNameValidationMessage = ref('');

  const orgPublicId = useRoute().params.orgId as string;

  const orgMembersQuery = await $trpc.org.members.getOrgMembers.query({
    orgPublicId: orgPublicId
  });
</script>

<template>
  <div class="flex flex-col w-full h-full items-start justify-between p-4">
    <div class="flex flex-row w-full justify-between items-center">
      <div class="flex flex-row gap-4 items-center">
        <div class="flex flex-col gap-1">
          <span class="font-display text-2xl">Members</span>
          <span class="text-sm">Manage your org members</span>
        </div>
      </div>
      <div class="flex flex-row gap-4 items-center">
        <button
          class="flex flex-row gap-2 p-2 border-1 rounded items-center justify-center border-base-7 bg-base-3 max-w-80">
          <icon
            name="ph-plus"
            size="20" />
          <p class="text-sm">Invite</p>
        </button>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4 w-full overflow-y-scroll">
      <div
        v-for="member of orgMembersQuery.members"
        class="w-full bg-base-2 p-4 rounded">
        <div class="flex flex-col gap-2">
          <div class="flex flex-row gap-2">
            <UnUiAvatar
              :avatarId="member.profile.avatarId ? member.profile.avatarId : ''"
              :name="
                member.profile.firstName ? member.profile.firstName : ''
              " />
            <div class="flex flex-col gap-0">
              <span class="font-medium text-lg">
                {{ member.profile.firstName + ' ' + member.profile.lastName }}
                <span class="font-italic"> {{ member.profile.nickname }}</span>
              </span>
              <span class="text-sm">{{ member.profile.title }}</span>
            </div>
          </div>
        </div>
        {{ member }}
      </div>
    </div>
  </div>
</template>
