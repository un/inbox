<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { z } from 'zod';
  import { useClipboard, useTimeAgo } from '@vueuse/core';

  const { copy, copied, text } = useClipboard();
  const { $trpc, $i18n } = useNuxtApp();
  const route = useRoute();

  const orgPublicId = route.params.orgId as string;
  const groupPublicId = route.params.groupId as string;
  const isNewGroup = route.query.new === 'true';

  const {
    data: groupData,
    pending: groupPending,
    error,
    refresh
  } = await $trpc.org.userGroups.getUserGroup.useLazyQuery(
    {
      orgPublicId: orgPublicId,
      userGroupPublicId: groupPublicId,
      newUserGroup: isNewGroup
    },
    { server: false }
  );

  const tableColumns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true
    },
    {
      key: 'title',
      label: 'Title'
    },

    {
      key: 'notifications',
      label: 'Notifications',
      sortable: true
    }
  ];
  interface TableRow {
    avatarId: string;
    name: string;
    nickname: string;
    title: string;
    role: string;
    notifications: string;
  }

  const tableRows = ref<TableRow[]>([]);
  watch(groupData, (newResults) => {
    if (newResults?.group?.members) {
      for (const member of newResults?.group?.members) {
        tableRows.value.push({
          avatarId: member.userProfile?.avatarId || '',
          name:
            member.userProfile?.firstName + ' ' + member.userProfile?.lastName,
          nickname: member.userProfile?.nickname || '',
          title: member.userProfile?.title || '',
          role: member.role,
          notifications: member.notifications
        });
      }
    }
  });

  // TODO: If Existing SPF, Add checkbox to SPF record: "Select which senders to include" + create dynamic string- suggestion by @KumoMTA
</script>

<template>
  <div class="flex flex-col w-full h-full items-start p-4 gap-8">
    <div class="flex flex-row w-full justify-between items-center">
      <div class="flex flex-row gap-4 items-center">
        <UnUiTooltip text="Back to domains">
          <icon
            name="ph-arrow-left"
            size="32"
            @click="navigateTo(`/settings/org/${orgPublicId}/users/groups`)" />
        </UnUiTooltip>
        <UnUiAvatar
          :color="groupData?.group?.color || 'base'"
          :name="groupData?.group?.name"
          :avatar-id="groupData?.group?.avatarId || ''"
          size="lg" />

        <div class="flex flex-col gap-1">
          <span
            class="font-display text-2xl"
            v-if="!groupPending">
            {{ groupData?.group?.name }}
          </span>
          <span
            class="text-xl"
            v-if="!groupPending">
            {{ groupData?.group?.description }}
          </span>
          <span
            class="font-mono text-2xl"
            v-if="groupPending">
            Loading...
          </span>
        </div>
      </div>
    </div>
    <div class="flex flex-col gap-8 w-full overflow-y-scroll">
      <div
        class="flex flex-col gap-8 w-full"
        v-if="groupPending">
        <div class="flex flex-row gap-4 items-center">
          <div class="flex flex-col gap-1">
            <span class="font-display text-2xl">Loading...</span>
            <span class="text-sm">Please wait while we load your group</span>
          </div>
        </div>
      </div>
      <div
        class="flex flex-col gap-8 w-full"
        v-if="!groupPending && !groupData?.group">
        <div class="flex flex-row gap-4 items-center">
          <div class="flex flex-col gap-1">
            <span class="font-display text-2xl">Group not found</span>
            <span class="text-sm"></span>
          </div>
        </div>
      </div>

      <div
        class="flex flex-col gap-8 w-full"
        v-if="!groupPending && groupData?.group">
        <div class="flex flex-col gap-4">
          <div class="w-full border-b-1 border-base-5 pb-2">
            <span class="text-sm uppercase text-base-11 font-semibold">
              Members
            </span>
          </div>
          {{ groupData }}
          <UnUiTable
            :columns="tableColumns"
            :rows="tableRows"
            class=""
            :loading="groupPending">
            <template #name-data="{ row }">
              <div class="py-1 px-4 rounded-full w-fit">
                <UiUnAvatar
                  :avatarId="row.avatarId"
                  :name="row.name"
                  size="xs" />
                <span class="">{{ row.name }}</span>
              </div>
            </template>
            <template #title-data="{ row }">
              <div class="w-fit">
                <span class="text-md">{{ row.title }}</span>
              </div>
            </template>
            <template #notifications-data="{ row }">
              <UnUiTooltip
                :text="
                  row.notifications === 'active'
                    ? 'Active'
                    : row.notifications === 'muted'
                    ? 'Muted'
                    : 'Off'
                ">
                <Icon
                  :name="
                    row.notifications === 'active'
                      ? 'ph:bell-simple-ringing'
                      : row.notifications === 'muted'
                      ? 'ph:speaker-simple-slash'
                      : 'ph:bell-simple-slash'
                  " />
              </UnUiTooltip>
            </template>

            <template #receivingMode-data="{ row }">
              <div
                class="py-1 px-4 rounded-full w-fit"
                :class="
                  row.receivingMode === 'native'
                    ? 'bg-grass-5'
                    : row.receivingMode === 'forwarding'
                    ? 'bg-orange-5'
                    : 'bg-red-5'
                ">
                <span class="uppercase text-xs">{{ row.receivingMode }}</span>
              </div>
            </template>
          </UnUiTable>
        </div>
      </div>
    </div>
  </div>
</template>
