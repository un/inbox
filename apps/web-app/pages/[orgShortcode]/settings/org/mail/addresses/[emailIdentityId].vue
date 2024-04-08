<script setup lang="ts">
  import { navigateTo, useNuxtApp, useRoute } from '#imports';
  import type { UiColor } from '@u22n/types/ui';

  const orgShortcode = useRoute().params.orgShortcode as string;

  const { $trpc } = useNuxtApp();

  const route = useRoute();
  const emailIdentityId = route.params.emailIdentityId as string;

  const { data: emailIdentityData, pending: emailIdentityPending } =
    await $trpc.org.mail.emailIdentities.getEmailIdentity.useLazyQuery(
      {
        emailIdentityPublicId: emailIdentityId
      },
      {
        server: false
      }
    );
</script>

<template>
  <div
    class="flex h-full w-full flex-col items-start gap-8 overflow-y-auto p-2">
    <div class="flex w-full flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-2">
        <UnUiButton
          icon="i-ph-arrow-left"
          square
          variant="soft"
          @click="
            navigateTo(`/${orgShortcode}/settings/org/mail/addresses/`)
          " />

        <div class="flex flex-col gap-1">
          <span class="font-display text-2xl">Edit Email Address</span>
        </div>
      </div>
    </div>

    <div class="flex w-full flex-col gap-8">
      <span>
        Sorry editing is not yet implemented. If you made an error or something
        is not working as expected, please contact support
      </span>
      <div
        v-if="!emailIdentityPending"
        class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <span class="text-base-12 text-sm font-medium uppercase">
            Email Address
          </span>
          <span class="">
            {{ emailIdentityData?.emailIdentityData?.username }}@{{
              emailIdentityData?.emailIdentityData?.domainName
            }}
          </span>
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-base-12 text-sm font-medium uppercase">
            Forwarding Address
          </span>
          <span class="">
            {{ emailIdentityData?.emailIdentityData?.forwardingAddress }}
          </span>
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-base-12 text-sm font-medium uppercase">
            Send Name
          </span>
          <span class="">
            {{ emailIdentityData?.emailIdentityData?.sendName }}
          </span>
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-base-12 text-sm font-medium uppercase">
            Is Catch All
          </span>
          <span class="">
            {{ emailIdentityData?.emailIdentityData?.isCatchAll }}
          </span>
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-base-12 text-sm font-medium uppercase">
            Destinations (deliver to)
          </span>
          <div
            v-for="destination of emailIdentityData?.emailIdentityData
              ?.routingRules.destinations"
            :key="destination.id">
            <div
              v-if="destination.groupId && destination.group"
              class="bg-base-2 flex flex-row items-center gap-8 rounded-xl p-2">
              <div class="flex flex-row items-center gap-4">
                <UnUiAvatar
                  :public-id="destination.group?.publicId"
                  :avatar-timestamp="destination.group?.avatarTimestamp"
                  :type="'group'"
                  :alt="destination.group?.name"
                  :color="destination.group?.color as UiColor"
                  size="xs" />
                <div class="flex flex-col gap-1">
                  <span class="font-semibold leading-none">
                    {{ destination.group?.name }}
                  </span>

                  <span class="leading-none">
                    {{ destination.group?.description }}
                  </span>
                </div>
              </div>
            </div>

            <div
              v-if="destination.orgMemberId && destination.orgMember?.profile"
              class="bg-base-2 flex flex-row items-center gap-8 rounded-xl p-2">
              <div class="flex flex-row items-center gap-4">
                <UnUiAvatar
                  :public-id="destination.orgMember?.profile?.publicId"
                  :avatar-timestamp="
                    destination.orgMember?.profile?.avatarTimestamp
                  "
                  :type="'orgMember'"
                  :alt="
                    destination.orgMember?.profile?.firstName +
                    ' ' +
                    destination.orgMember?.profile?.lastName
                  "
                  size="xs" />
                <div class="flex flex-col gap-1">
                  <div class="flex h-[16px] flex-row items-center gap-1">
                    <span class="font-semibold leading-none">
                      {{
                        destination.orgMember?.profile?.firstName +
                        ' ' +
                        destination.orgMember?.profile?.lastName
                      }}
                    </span>
                    <UnUiTooltip
                      v-if="destination.orgMember?.role === 'admin'"
                      text="Organization Admin"
                      class="h-[16px] w-[16px]">
                      <UnUiIcon
                        name="i-ph-crown"
                        class="text-yellow-8"
                        size="16" />
                    </UnUiTooltip>
                  </div>
                  <span class="leading-none">
                    @{{ destination.orgMember?.profile?.handle }}
                  </span>
                  <span class="leading-none">
                    {{ destination.orgMember?.profile?.title }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
