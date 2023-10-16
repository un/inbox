<script setup lang="ts">
  definePageMeta({
    layout: 'settings',
    middleware: 'ee'
  });
  import { z } from 'zod';
  import { useClipboard } from '@vueuse/core';

  const { copy, copied, text } = useClipboard();
  const { $trpc, $i18n } = useNuxtApp();

  const {
    data: userLifetimeOverview,
    pending,
    error
  } = await $trpc.org.setup.billing.getUserLifetimeLicenses.useLazyQuery({
    server: false
  });

  const showPricingTable = ref(false);
  const pricingTableBillingPeriod = ref<'monthly' | 'yearly'>('monthly');
  const loadingButton = ref(false);

  async function purchaseLifetime() {
    const { data: linkData, pending: linkPending } =
      await $trpc.org.setup.billing.getLifetimePaymentLink.useLazyQuery(
        {},
        { server: false }
      );
    console.log({ linkData });

    navigateTo(linkData?.value?.lifetimeLink, {
      external: true,
      open: { target: '_blank' }
    });
  }
</script>

<template>
  <div class="h-full w-full flex flex-col items-start gap-8 p-4">
    <div class="w-full flex flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-2xl font-display">Lifetime Licenses</span>
          <span class="text-sm"> Manage your Un Lifetime Licenses </span>
        </div>
      </div>
    </div>

    <div class="w-full flex flex-col gap-8 overflow-y-scroll">
      <div
        v-if="pending"
        class="w-full flex flex-col gap-8">
        Loading
      </div>
      <div
        v-if="error"
        class="w-full flex flex-col gap-8">
        {{ error }}
      </div>
      <div class="w-full flex flex-col gap-8">
        <div
          v-if="!pending"
          class="w-full flex flex-col gap-8">
          <div class="flex flex-col">
            <span class="text-sm font-medium text-base-11">
              Owned Lifetime Licenses
            </span>
            <span class="text-3xl font-display capitalize">{{
              userLifetimeOverview?.count
            }}</span>
          </div>

          <div
            v-if="
              userLifetimeOverview?.count && userLifetimeOverview?.count > 0
            "
            class="w-full flex flex-col gap-4 overflow-auto">
            <span class="text-sm font-medium text-base-11">
              License Assignments
            </span>
            <div class="w-full flex flex-row flex-wrap gap-8">
              <div
                v-for="license of userLifetimeOverview?.licenses"
                :key="license.publicId"
                class="w-80 flex flex-col gap-4 border-1 border-base-6 rounded-lg bg-base-2 p-8">
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-base-11">
                    License Id
                  </span>
                  <span class="text-xl font-display capitalize">{{
                    license.publicId
                  }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-sm font-medium text-base-11">
                    Assigned to organization
                  </span>
                  <div
                    v-if="license.orgBillingProfile?.org"
                    class="flex flex-row items-center gap-4">
                    <UnUiAvatar
                      :avatar-id="license.orgBillingProfile?.org.avatarId || ''"
                      :name="license.orgBillingProfile?.org.name" />
                    <span class="text-xl font-display capitalize">
                      {{ license.orgBillingProfile?.org.name }}
                    </span>
                  </div>
                  <div
                    v-if="!license.orgBillingProfile?.org"
                    class="flex flex-row items-center gap-4">
                    <span class="text-xl font-display capitalize">
                      Unassigned
                    </span>
                  </div>
                </div>
              </div>
            </div>
            Contact support to manage your lifetime licenses.
          </div>
        </div>

        <UnUiButton
          label="Buy lifetime licenses"
          variant="solid"
          @click="purchaseLifetime" />
      </div>
    </div>
  </div>
</template>
