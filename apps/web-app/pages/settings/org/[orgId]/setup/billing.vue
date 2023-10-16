<script setup lang="ts">
  definePageMeta({
    layout: 'settings',
    middleware: 'ee'
  });
  import { z } from 'zod';
  import { useClipboard } from '@vueuse/core';

  const { copy, copied, text } = useClipboard();
  const { $trpc, $i18n } = useNuxtApp();
  const orgPublicId = useRoute().params.orgId as string;

  const {
    data: orgBillingOverview,
    pending,
    error
  } = await $trpc.org.setup.billing.getOrgBillingOverview.useLazyQuery(
    {
      orgPublicId: orgPublicId
    },
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
        orgPublicId: orgPublicId,
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
      await $trpc.org.setup.billing.getOrgStripePortalLink.useLazyQuery({
        orgPublicId: orgPublicId
      });

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
            <span class="text-sm font-medium text-base-11">Current Plan</span>
            <span class="text-2xl font-display capitalize">{{
              orgBillingOverview?.currentPlan
            }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-medium text-base-11">Users</span>
            <span class="text-2xl font-display">{{
              orgBillingOverview?.totalUsers
            }}</span>
          </div>
          <div
            v-if="orgBillingOverview?.lifetimeUsers"
            class="flex flex-col">
            <span class="text-sm font-medium text-base-11">Lifetime Users</span>
            <span class="text-2xl font-display">
              {{ orgBillingOverview?.lifetimeUsers }}
            </span>
          </div>
          <div
            v-if="orgBillingOverview?.lifetimeUsers"
            class="flex flex-col">
            <span class="text-sm font-medium text-base-11">Paid Users</span>
            <span class="text-2xl font-display">
              {{
                orgBillingOverview?.totalUsers -
                orgBillingOverview?.lifetimeUsers
              }}
            </span>
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
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-sm leading-none text-base-12">
                      Multiple users
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-sm leading-none text-base-12">
                      @uninbox.me email addresses
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-sm leading-none text-base-12">
                      Forwarding Address
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-sm leading-none text-base-12">
                      Unlimited Projects
                    </span>
                  </div>
                </div>
                <div class="flex flex-row items-center gap-2">
                  <span class="text-4xl leading-none font-display">$0</span>
                  <div class="flex flex-col gap-0">
                    <span class="text-sm font-medium leading-none text-base-11"
                      >per user</span
                    >
                    <span class="text-sm font-medium leading-none text-base-11"
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
                  Starter Plan
                </span>
                <div class="flex flex-col justify-start gap-4">
                  <div class="flex flex-row items-center gap-2">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-sm leading-none text-base-12">
                      Everything in "Free Plan"
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-sm leading-none text-base-12">
                      User Groups
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-sm leading-none text-base-12">
                      Multiple email destinations
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-sm leading-none text-base-12">
                      1 Custom Domain
                    </span>
                  </div>
                </div>
                <div class="flex flex-row items-center gap-2">
                  <span class="text-4xl leading-none font-display"
                    >${{
                      pricingTableBillingPeriod === 'yearly' ? '90' : '9'
                    }}</span
                  >
                  <div class="flex flex-col gap-0">
                    <span class="text-sm font-medium leading-none text-base-11"
                      >per user</span
                    >
                    <span class="text-sm font-medium leading-none text-base-11"
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
                  :label="loadingButton === 'starter' ? 'Loading' : 'Subscribe'"
                  variant="solid"
                  width="full"
                  :loading="loadingButton === 'starter'"
                  @click="subscribeToPlan('starter')" />
              </div>
              <div
                class="min-w-xs flex flex-col gap-8 border-1 border-base-7 rounded-xl bg-base-2 p-8">
                <span class="text-xl leading-none font-display">
                  Pro Plan
                </span>
                <div class="flex flex-col justify-start gap-4">
                  <div class="flex flex-row items-center gap-2">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-sm leading-none text-base-12">
                      Everything in "Starter Plan"
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-sm leading-none text-base-12">
                      Catch-all Address
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-sm leading-none text-base-12">
                      Unlimited Projects
                    </span>
                  </div>
                  <div class="flex flex-row items-center gap-2">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-sm leading-none text-base-12">
                      Unlimited Custom Domains
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
                    <span class="text-sm font-medium leading-none text-base-11"
                      >per user</span
                    >
                    <span class="text-sm font-medium leading-none text-base-11"
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
                  width="full"
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
