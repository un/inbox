<script setup lang="ts">
  import { useTimeAgo } from '@vueuse/core';
  import { useClipboard } from '@vueuse/core';

  const { $trpc } = useNuxtApp();

  type PromiseType<T> = T extends Promise<infer U> ? U : never;
  type OrgInvitesData = PromiseType<
    //@ts-ignore
    ReturnType<typeof $trpc.org.invites.viewInvites.query>
  >['invites'];

  type Props = {
    inviteData: OrgInvitesData[number];
    isExpired: boolean;
  };

  const props = defineProps<Props>();

  const inviterName = computed(() => {
    return (
      props.inviteData.invitedByUser.orgMemberships[0].profile.firstName +
      ' ' +
      props.inviteData.invitedByUser.orgMemberships[0].profile.lastName
    );
  });
  const inviterPublicId = computed(() => {
    return props.inviteData.invitedByUser.orgMemberships[0].profile.publicId;
  });

  const inviteeName = computed(() => {
    return props.inviteData.invitedUser
      ? props.inviteData.invitedUser.orgMemberships[0].profile.firstName +
          ' ' +
          props.inviteData.invitedUser.orgMemberships[0].profile.lastName
      : '';
  });
  const inviteePublicId = computed(() => {
    return props.inviteData.invitedUser
      ? props.inviteData.invitedUser.orgMemberships[0].profile.PublicId
      : null;
  });
</script>
<template>
  <div class="w-full flex flex-row justify-between gap-4 bg-base-2 p-4">
    <div class="w-full flex flex-col gap-8">
      <div class="w-full flex flex-col gap-0">
        <span class="text-sm text-base-11 font-semibold uppercase"> Code </span>
        <div class="flex flex-row gap-4">
          <span class="font-mono">{{ props.inviteData.inviteToken }}</span>
          <UnUiCopy :text="props.inviteData.inviteToken" />
        </div>
      </div>
      <div
        v-if="props.inviteData.email"
        class="w-full flex flex-col gap-0">
        <span class="text-sm text-base-11 font-semibold uppercase">
          Email
        </span>
        <div class="flex flex-row gap-4">
          <span class="font-mono lowercase">{{ props.inviteData.email }}</span>
        </div>
      </div>
    </div>
    <div class="w-full flex flex-col gap-8">
      <div class="w-full flex flex-col gap-0">
        <div
          v-if="
            !props.inviteData.invitedUser?.orgMemberships &&
            props.inviteData.expiresAt
          "
          class="flex flex-col gap-0">
          <span class="text-sm text-base-11 font-semibold uppercase">
            {{
              props.inviteData.expiresAt < new Date() ? 'Expired' : 'Expires on'
            }}
          </span>
          <div class="flex flex-row gap-4">
            <span class="font-mono">{{
              props.inviteData.expiresAt.toDateString()
            }}</span>
          </div>
        </div>
        <div class="flex flex-col gap-0">
          <span
            v-if="props.inviteData.invitedUser?.orgMemberships"
            class="text-sm text-base-11 font-semibold uppercase">
            Used by
          </span>
          <div
            v-if="props.inviteData.invitedUser?.orgMemberships"
            class="flex flex-row items-center gap-2">
            <div class="flex flex-row items-center gap-2">
              <UnUiAvatar
                :public-id="inviteePublicId"
                :type="'user'"
                :size="'md'"
                :alt="inviteeName" />
              <span class="text-sm font-medium"> {{ inviteeName }}</span>
            </div>
            <span class="text-sm text-base-11 font-semibold uppercase">
              on
            </span>
            <div
              v-if="
                props.inviteData.invitedUser?.orgMemberships &&
                props.inviteData.acceptedAt
              "
              class="flex flex-row items-center gap-0">
              <div class="flex flex-row gap-4">
                <span class="font-mono">{{
                  props.inviteData.acceptedAt.toDateString()
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="w-full flex flex-col gap-0">
        <span class="text-sm text-base-11 font-semibold uppercase">
          Created by
        </span>
        <div class="flex flex-row items-center gap-2">
          <div class="flex flex-row items-center gap-2">
            <div class="flex flex-row items-center gap-2">
              <UnUiAvatar
                :public-id="inviterPublicId"
                :type="'user'"
                :size="'md'"
                :alt="inviterName" />
              <span class="text-sm font-medium"> {{ inviterName }}</span>
            </div>
            <span class="text-sm text-base-11 font-semibold uppercase">
              on
            </span>
            <div
              v-if="props.inviteData.invitedAt"
              class="flex flex-row items-center gap-2">
              <div class="flex flex-row gap-4">
                <span class="font-mono">{{
                  props.inviteData.invitedAt.toDateString()
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
