<script setup lang="ts">
  import { useTimeAgo } from '@vueuse/core';
  import { useClipboard } from '@vueuse/core';
  const { copy, copied } = useClipboard();

  const { $trpc } = useNuxtApp();

  type PromiseType<T> = T extends Promise<infer U> ? U : never;
  type OrgInvitesData = PromiseType<
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
  const inviterAvatarId = computed(() => {
    return props.inviteData.invitedByUser.orgMemberships[0].profile.avatarId;
  });

  const inviteeName = computed(() => {
    return props.inviteData.invitedUser
      ? props.inviteData.invitedUser.orgMemberships[0].profile.firstName +
          ' ' +
          props.inviteData.invitedUser.orgMemberships[0].profile.lastName
      : null;
  });
  const inviteeAvatarId = computed(() => {
    return props.inviteData.invitedUser
      ? props.inviteData.invitedUser.orgMemberships[0].profile.avatarId
      : null;
  });

  const imageUrlAccountHash = useRuntimeConfig().public.cfImagesAccountHash;
</script>
<template>
  <div class="flex flex-row w-full p-4 gap-4 bg-base-2 justify-between">
    <div class="w-full flex flex-col gap-8">
      <div class="w-full flex flex-col gap-0">
        <span class="text-sm uppercase font-semibold text-base-11"> Code </span>
        <div class="flex flex-row gap-4">
          <span class="font-mono">{{ props.inviteData.inviteToken }}</span>
          <button
            v-if="props.inviteData.inviteToken"
            class="flex flex-row gap-1 p-1 rounded items-center justify-center bg-base-3 hover:bg-base-4 text-xs"
            @click="copy(props.inviteData.inviteToken)">
            <!-- by default, `copied` will be reset in 1.5s -->
            <Icon
              name="ph-clipboard"
              size="16"
              :class="copied ? 'text-green-500' : 'text-base-11'" />
            <span v-if="!copied">Copy</span>
            <span v-else>Copied!</span>
          </button>
        </div>
      </div>
      <div
        class="w-full flex flex-col gap-0"
        v-if="props.inviteData.email">
        <span class="text-sm uppercase font-semibold text-base-11">
          Email
        </span>
        <div class="flex flex-row gap-4">
          <span class="font-mono lowercase">{{ props.inviteData.email }}</span>
        </div>
      </div>
    </div>
    <div class="flex flex-col gap-8 w-full">
      <div class="flex flex-col gap-0 w-full">
        <div
          class="flex flex-col gap-0"
          v-if="
            !props.inviteData.invitedUser?.orgMemberships &&
            props.inviteData.expiresAt
          ">
          <span class="text-sm uppercase font-semibold text-base-11">
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
            class="text-sm uppercase font-semibold text-base-11"
            v-if="props.inviteData.invitedUser?.orgMemberships">
            Used by
          </span>
          <div
            class="flex flex-row gap-2 items-center"
            v-if="props.inviteData.invitedUser?.orgMemberships">
            <div class="flex flex-row gap-2 items-center">
              <div
                class="bg-cover bg-center font-display flex justify-center items-center w-[32px] h-[32px] rounded"
                :style="
                  inviteeAvatarId
                    ? `background-image: url(https://imagedelivery.net/${imageUrlAccountHash}/${inviteeAvatarId}/32x32)`
                    : ''
                ">
                {{ inviteeAvatarId ? '' : inviteeName }}
              </div>
              <span class="font-medium text-sm"> {{ inviteeName }}</span>
            </div>
            <span class="text-sm uppercase font-semibold text-base-11">
              on
            </span>
            <div
              class="flex flex-row gap-0 items-center"
              v-if="
                props.inviteData.invitedUser?.orgMemberships &&
                props.inviteData.acceptedAt
              ">
              <div class="flex flex-row gap-4">
                <span class="font-mono">{{
                  props.inviteData.acceptedAt.toDateString()
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-0 w-full">
        <span class="text-sm uppercase font-semibold text-base-11">
          Created by
        </span>
        <div class="flex flex-row gap-2 items-center">
          <div class="flex flex-row gap-2 items-center">
            <div class="flex flex-row gap-2 items-center">
              <div
                class="bg-cover bg-center font-display flex justify-center items-center w-[32px] h-[32px] rounded"
                :style="
                  inviterAvatarId
                    ? `background-image: url(https://imagedelivery.net/${imageUrlAccountHash}/${inviterAvatarId}/32x32)`
                    : ''
                ">
                {{ inviterAvatarId ? '' : inviterName }}
              </div>
              <span class="font-medium text-sm"> {{ inviterName }}</span>
            </div>
            <span class="text-sm uppercase font-semibold text-base-11">
              on
            </span>
            <div
              class="flex flex-row gap-2 items-center"
              v-if="props.inviteData.invitedAt">
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
