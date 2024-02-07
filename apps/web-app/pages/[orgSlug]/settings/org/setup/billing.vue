<script setup lang="ts">
  definePageMeta({
    middleware: 'ee'
  });
  import { z } from 'zod';
  import { useClipboard } from '@vueuse/core';

  const { copy, copied, text } = useClipboard();
  const { $trpc, $i18n } = useNuxtApp();

  const {
    data: orgBillingOverview,
    pending,
    error
  } = await $trpc.org.setup.billing.getOrgBillingOverview.useLazyQuery(
    {},
    {
      server: false
    }
  );

  const showPricingTable = ref(false);
  const pricingTableBillingPeriod = ref<'monthly' | 'yearly'>('monthly');
  const loadingButton = ref('');

  async function subscribeToPlan(plan: 'starter' | 'pro') {
    loadingButton.value = plan;
    const billingPeriod = pricingTableBillingPeriod.value;
    const { data: linkData, pending: linkPending } =
      await $trpc.org.setup.billing.getOrgSubscriptionPaymentLink.useLazyQuery({
        plan: plan,
        period: billingPeriod
      });

    navigateTo(linkData?.value?.subLink, {
      external: true,
      open: { target: '_blank' }
    });
    loadingButton.value = '';
  }
  const goToPortalButtonLoading = ref(false);
  async function goToBillingPortal() {
    goToPortalButtonLoading.value = true;
    const { data: linkData, pending: linkPending } =
      await $trpc.org.setup.billing.getOrgStripePortalLink.useLazyQuery(
        {},
        {
          server: false
        }
      );

    navigateTo(linkData?.value?.portalLink, {
      external: true,
      open: { target: '_blank' }
    });
    goToPortalButtonLoading.value = false;
  }
</script>

<template>
  <div class="h-full w-full flex flex-col items-start gap-8 p-4">
    <div class="w-full flex flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-2xl font-display">Billing</span>
          <span class="text-sm"> Manage your organization's subscription </span>
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
          class="w-full flex flex-row gap-8">
          <div class="flex flex-col">
            <span class="text-sm text-base-11 font-medium">Current Plan</span>
            <span class="text-2xl font-display capitalize">{{
              orgBillingOverview?.currentPlan
            }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-sm text-base-11 font-medium">Users</span>
            <span class="text-2xl font-display">{{
              orgBillingOverview?.totalUsers
            }}</span>
          </div>
        </div>
        <div v-if="orgBillingOverview?.currentPlan === 'free'">
          <UnUiButton
            v-if="!showPricingTable"
            label="Upgrade"
            variant="solid"
            @click="showPricingTable = true" />
          <div
            v-if="showPricingTable"
            class="flex flex-col items-center gap-8">
            <div
              class="w-fit flex flex-row items-center justify-center gap-0 border-1 border-base-7 rounded-lg bg-base-3 p-1">
              <button
                class="rounded-md px-6 py-1"
                :class="
                  pricingTableBillingPeriod === 'monthly'
                    ? 'bg-primary-9 border-1 border-primary-7'
                    : ''
                "
                @click="pricingTableBillingPeriod = 'monthly'">
                <span class="text-xs font-semibold uppercase"> Monthly </span>
              </button>
              <button
                class="rounded-md px-6 py-1"
                :class="
                  pricingTableBillingPeriod === 'yearly'
                    ? 'bg-primary-9 border-1 border-primary-7'
                    : ''
                "
                @click="pricingTableBillingPeriod = 'yearly'">
                <span class="text-xs font-semibold uppercase"> yearly </span>
              </button>
            </div>
            <div class="w-full flex flex-row flex-wrap justify-center gap-8">
              <div
                class="min-w-xs flex flex-col gap-8 border-1 border-base-7 rounded-xl bg-base-2 p-8">
                <span class="text-xl leading-none font-display">
                  Free Plan
                </span>
                <div class="flex flex-col justify-start gap-4">
                  <div class="flex flex-row items-center gap-2">
                    <UnUiIcon name="i-ph-check-circle-fill" />
                    <span class="text-sm text-base-12 leading-none">
                      Multiple users
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <UnUiIcon name="i-ph-check-circle-fill" />
                    <span class="text-sm text-base-12 leading-none">
                      @uninbox.me email addresses
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <UnUiIcon name="i-ph-check-circle-fill" />
                    <span class="text-sm text-base-12 leading-none">
                      Forwarding Address
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <UnUiIcon name="i-ph-check-circle-fill" />
                    <span class="text-sm text-base-12 leading-none">
                      Private Notes
                    </span>
                  </div>
                </div>
                <div class="flex flex-row items-center gap-2">
                  <span class="text-4xl leading-none font-display">$0</span>
                  <div class="flex flex-col gap-0">
                    <span class="text-sm text-base-11 font-medium leading-none"
                      >per user</span
                    >
                    <span class="text-sm text-base-11 font-medium leading-none"
                      >per
                      {{
                        pricingTableBillingPeriod === 'yearly'
                          ? 'year'
                          : 'month'
                      }}</span
                    >
                  </div>
                </div>
                <UnUiButton
                  label="Current Plan"
                  variant="solid"
                  width="full"
                  :loading="loadingButton === 'starter'"
                  :disabled="true" />
              </div>
              <div
                class="min-w-xs flex flex-col gap-8 border-1 border-base-7 rounded-xl bg-base-2 p-8">
                <span class="text-xl leading-none font-display">
                  Pro Plan
                </span>
                <div class="flex flex-col justify-start gap-4">
                  <div class="flex flex-row items-center gap-2">
                    <UnUiIcon name="i-ph-check-circle-fill" />
                    <span class="text-sm text-base-12 leading-none">
                      User Groups
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <UnUiIcon name="i-ph-check-circle-fill" />
                    <span class="text-sm text-base-12 leading-none">
                      Custom Domains
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <UnUiIcon name="i-ph-check-circle-fill" />
                    <span class="text-sm text-base-12 leading-none">
                      Catch-all Address
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <UnUiIcon name="i-ph-check-circle-fill" />
                    <span class="text-sm text-base-12 leading-none">
                      Shared Notes
                    </span>
                  </div>
                </div>
                <div class="flex flex-row items-center gap-2">
                  <span class="text-4xl leading-none font-display"
                    >${{
                      pricingTableBillingPeriod === 'yearly' ? '120' : '12'
                    }}</span
                  >
                  <div class="flex flex-col gap-0">
                    <span class="text-sm text-base-11 font-medium leading-none"
                      >per user</span
                    >
                    <span class="text-sm text-base-11 font-medium leading-none"
                      >per
                      {{
                        pricingTableBillingPeriod === 'yearly'
                          ? 'year'
                          : 'month'
                      }}</span
                    >
                  </div>
                </div>
                <UnUiButton
                  :label="loadingButton === 'pro' ? 'Loading' : 'Subscribe'"
                  variant="solid"
                  :loading="loadingButton === 'pro'"
                  @click="subscribeToPlan('pro')" />
              </div>
            </div>
            <div class="w-full text-center">
              <NuxtLink
                to="https://uninbox.com/pricing"
                target="_blank">
                See all plan features
              </NuxtLink>
            </div>
          </div>
        </div>

        <div v-if="orgBillingOverview?.currentPlan !== 'free'">
          <UnUiButton
            label="Manage Billing"
            variant="solid"
            :loading="goToPortalButtonLoading"
            @click="goToBillingPortal()" />
        </div>
      </div>
    </div>
  </div>
</template>
