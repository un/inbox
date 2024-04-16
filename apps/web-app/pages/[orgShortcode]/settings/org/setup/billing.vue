<script setup lang="ts">
  import {
    definePageMeta,
    navigateTo,
    onMounted,
    onUnmounted,
    ref,
    watch,
    useNuxtApp,
    useRoute
  } from '#imports';
  import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';

  const breakpoints = useBreakpoints(breakpointsTailwind);
  const isMobile = breakpoints.smaller('lg'); // only smaller than lg
  const orgShortcode = useRoute().params.orgShortcode as string;

  definePageMeta({
    middleware: 'ee'
  });

  const { $trpc } = useNuxtApp();

  const {
    data: orgBillingOverview,
    pending,
    error,
    refresh: refreshBillingOverview
  } = await $trpc.org.setup.billing.getOrgBillingOverview.useLazyQuery(
    {},
    {
      server: false
    }
  );

  const showPricingTable = ref(false);
  const pricingTableBillingPeriod = ref<'monthly' | 'yearly'>('monthly');
  const loadingButton = ref('');
  const pendingAction = ref(false);
  const currentPlan = ref(orgBillingOverview?.value?.currentPlan);
  const calStatus = ref<'loading' | 'loaded' | 'showing'>('loading');

  async function subscribeToPlan(plan: 'starter' | 'pro') {
    loadingButton.value = plan;
    pendingAction.value = true;
    watchStripeData();
    const billingPeriod = pricingTableBillingPeriod.value;
    const { data: linkData } =
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

  function watchStripeData() {
    let hasChanged = false;
    const initialPlan = currentPlan.value;

    const intervalId = setInterval(async () => {
      await refreshBillingOverview();
      if (orgBillingOverview?.value?.currentPlan !== initialPlan) {
        hasChanged = true;
        pendingAction.value = false;
        clearInterval(intervalId);
      }
    }, 3000);
  }

  declare const Cal: Function;
  watch(orgBillingOverview, () => {
    if (
      orgBillingOverview.value?.currentPlan !== 'free' &&
      calStatus.value === 'loaded'
    ) {
      calStatus.value = 'showing';
      Cal('init', { origin: 'https://cal.com' });
      Cal('inline', {
        elementOrSelector: '#my-cal-inline',
        calLink: 'mc/unboarding',
        layout: 'month_view'
      });
      Cal('ui', {
        cssVarPerTheme: { branding: { brandColor: '#000000' } },
        hideEventTypeDetails: false,
        layout: 'month_view'
      });
    }
  });

  const goToPortalButtonLoading = ref(false);
  async function goToBillingPortal() {
    goToPortalButtonLoading.value = true;
    pendingAction.value = true;
    watchStripeData();
    const { data: linkData } =
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

  const script = document.createElement('script');
  // CAL
  onMounted(() => {
    script.setAttribute('src', '/calcom.js');
    document.head.appendChild(script);
    script.addEventListener('load', () => (calStatus.value = 'loaded'), {
      once: true
    });
  });
  onUnmounted(() => {
    script.remove();
  });
</script>

<template>
  <div class="flex h-full w-full flex-col items-start gap-8 p-4">
    <div class="flex w-full flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-4">
        <UnUiButton
          v-if="isMobile"
          icon="i-ph-arrow-left"
          square
          variant="soft"
          @click="navigateTo(`/${orgShortcode}/settings`)" />

        <div class="flex flex-col gap-1">
          <span class="font-display text-2xl">Billing</span>
          <span class="text-sm"> Manage your organization's subscription </span>
        </div>
      </div>
    </div>

    <div class="flex w-full flex-col gap-8 overflow-y-auto">
      <div
        v-if="pending"
        class="flex w-full flex-col gap-8">
        Loading
      </div>
      <div
        v-if="error"
        class="flex w-full flex-col gap-8">
        {{ error }}
      </div>
      <div class="flex w-full flex-col gap-8">
        <div
          v-if="!pending"
          class="flex w-full flex-row gap-8">
          <div class="flex flex-col">
            <span class="text-base-11 text-sm font-medium">Current Plan</span>
            <span class="font-display text-2xl capitalize">{{
              orgBillingOverview?.currentPlan
            }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-base-11 text-sm font-medium">Users</span>
            <span class="font-display text-2xl">{{
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
              class="border-base-7 bg-base-2 flex w-fit flex-row items-center justify-center gap-0 rounded-lg border-2 p-0">
              <button
                class="rounded-md px-6 py-1"
                :class="
                  pricingTableBillingPeriod === 'monthly'
                    ? 'bg-base-5  text-base-12 '
                    : ''
                "
                @click="pricingTableBillingPeriod = 'monthly'">
                <span class="text-xs font-semibold uppercase"> Monthly </span>
              </button>
              <button
                class="rounded-md px-6 py-1"
                :class="
                  pricingTableBillingPeriod === 'yearly'
                    ? 'bg-primary-9 border-primary-7 border-2'
                    : ''
                "
                @click="pricingTableBillingPeriod = 'yearly'">
                <span class="text-xs font-semibold uppercase"> yearly </span>
              </button>
            </div>
            <div class="row grid grid-cols-2 flex-wrap justify-center gap-8">
              <div
                class="min-w-xs border-base-7 bg-base-2 flex flex-col gap-8 rounded-xl border-2 p-4">
                <span class="font-display text-xl leading-none">
                  Free Plan
                </span>
                <div class="flex flex-col justify-start gap-4">
                  <div class="flex flex-row items-center gap-2">
                    <UnUiIcon name="i-ph-check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      Multiple users
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <UnUiIcon name="i-ph-check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      @uninbox.me email addresses
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <UnUiIcon name="i-ph-check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      Forwarding Address
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <UnUiIcon name="i-ph-check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      Private Notes
                    </span>
                  </div>
                </div>
                <div class="flex flex-row items-center gap-2">
                  <span class="font-display text-4xl leading-none">$0</span>
                  <div class="flex flex-col gap-0">
                    <span class="text-base-11 text-sm font-medium leading-none"
                      >per user</span
                    >
                    <span class="text-base-11 text-sm font-medium leading-none"
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
                class="min-w-xs border-base-7 bg-base-2 flex flex-col gap-8 rounded-xl border-2 p-4">
                <span class="font-display text-xl leading-none">
                  Pro Plan
                </span>
                <div class="flex flex-col justify-start gap-4">
                  <div class="flex flex-row items-center gap-2">
                    <UnUiIcon name="i-ph-check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      User Groups
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <UnUiIcon name="i-ph-check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      Custom Domains
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <UnUiIcon name="i-ph-check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      Catch-all Address
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <UnUiIcon name="i-ph-check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      Shared Notes
                    </span>
                  </div>
                </div>
                <div class="flex flex-row items-center gap-2">
                  <span class="font-display text-4xl leading-none"
                    >${{
                      pricingTableBillingPeriod === 'yearly' ? '80' : '8'
                    }}</span
                  >
                  <div class="flex flex-col gap-0">
                    <span class="text-base-11 text-sm font-medium leading-none"
                      >per user</span
                    >
                    <span class="text-base-11 text-sm font-medium leading-none"
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
                  :loading="loadingButton === 'pro' || pendingAction"
                  @click="subscribeToPlan('pro')" />
              </div>
            </div>
            <div class="w-full text-center">
              <NuxtLink
                to="https://uninbox.com/#pricing"
                target="_blank">
                See all plan features
              </NuxtLink>
            </div>
          </div>
        </div>

        <div
          v-if="orgBillingOverview?.currentPlan !== 'free'"
          class="flex flex-col gap-8">
          <UnUiButton
            label="Manage Billing"
            variant="solid"
            :loading="goToPortalButtonLoading || pendingAction"
            @click="goToBillingPortal()" />
          <div class="flex flex-col gap-8">
            <span class="text-base-11 font-medium"
              >Jump on a free unboarding call!</span
            >
            <div
              id="my-cal-inline"
              class="h-full w-full overflow-auto" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
