<script setup lang="ts">
  import { computed, useNuxtApp } from '#imports';

  const { $trpc } = useNuxtApp();

  type OrgInvitesData = Awaited<
    ReturnType<typeof $trpc.org.users.invites.viewInvites.query>
  >['invites'];

  type Props = {
    inviteData: OrgInvitesData[number];
    isExpired: boolean;
  };

  const props = defineProps<Props>();

  const inviterName = computed(() => {
    return (
      props.inviteData.invitedByOrgMember.profile.firstName +
      ' ' +
      props.inviteData.invitedByOrgMember.profile.lastName
    );
  });
  const inviterPublicId = computed(() => {
    return props.inviteData.invitedByOrgMember.profile.publicId;
  });

  const inviterAvatarId = computed(() => {
    return props.inviteData.invitedByOrgMember.profile.avatarId;
  });

  const inviteeName = computed(() => {
    return props.inviteData.orgMember
      ? props.inviteData.orgMember.profile.firstName +
          ' ' +
          props.inviteData.orgMember.profile.lastName
      : '';
  });
  const inviteePublicId = computed(() => {
    return props.inviteData.orgMember
      ? props.inviteData.orgMember.profile.publicId
      : null;
  });

  const inviteeAvatarId = computed(() => {
    return props.inviteData.orgMember
      ? props.inviteData.orgMember.profile.avatarId
      : null;
  });
</script>
<template>
  <div class="bg-base-2 flex w-full flex-row justify-between gap-4 p-4">
    <div class="flex w-full flex-col gap-8">
      <div class="flex w-full flex-col gap-0">
        <span class="text-base-11 text-sm font-semibold uppercase"> Code </span>
        <div class="flex flex-row gap-4">
          <span class="font-mono">{{ props.inviteData.inviteToken }}</span>
          <UnUiCopy :text="props.inviteData.inviteToken!" />
        </div>
      </div>
      <div
        v-if="props.inviteData.email"
        class="flex w-full flex-col gap-0">
        <span class="text-base-11 text-sm font-semibold uppercase">
          Email
        </span>
        <div class="flex flex-row gap-4">
          <span class="font-mono lowercase">{{ props.inviteData.email }}</span>
        </div>
      </div>
    </div>
    <div class="flex w-full flex-col gap-8">
      <div class="flex w-full flex-col gap-0">
        <div
          v-if="!props.inviteData.orgMember && props.inviteData.expiresAt"
          class="flex flex-col gap-0">
          <span class="text-base-11 text-sm font-semibold uppercase">
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
            v-if="props.inviteData.orgMember"
            class="text-base-11 text-sm font-semibold uppercase">
            Used by
          </span>
          <div
            v-if="props.inviteData.orgMember"
            class="flex flex-row items-center gap-2">
            <div class="flex flex-row items-center gap-2">
              <UnUiAvatar
                :public-id="inviteePublicId"
                :avatar-id="inviteeAvatarId"
                :type="'orgMember'"
                :size="'md'"
                :alt="inviteeName" />
              <span class="text-sm font-medium"> {{ inviteeName }}</span>
            </div>
            <span class="text-base-11 text-sm font-semibold uppercase">
              on
            </span>
            <div
              v-if="props.inviteData.orgMember && props.inviteData.acceptedAt"
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
      <div class="flex w-full flex-col gap-0">
        <span class="text-base-11 text-sm font-semibold uppercase">
          Created by
        </span>
        <div class="flex flex-row items-center gap-2">
          <div class="flex flex-row items-center gap-2">
            <div class="flex flex-row items-center gap-2">
              <UnUiAvatar
                :public-id="inviterPublicId"
                :avatar-id="inviterAvatarId"
                :type="'orgMember'"
                :size="'md'"
                :alt="inviterName" />
              <span class="text-sm font-medium"> {{ inviterName }}</span>
            </div>
            <span class="text-base-11 text-sm font-semibold uppercase">
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
