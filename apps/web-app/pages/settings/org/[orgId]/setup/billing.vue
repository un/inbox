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
    console.log({ linkData });

    navigateTo(linkData?.value?.subLink, {
      external: true,
      open: { target: '_blank' }
    });
    loadingButton.value = '';
  }
</script>

<template>
  <div class="flex flex-col w-full h-full items-start p-4 gap-8">
    <div class="flex flex-row w-full justify-between items-center">
      <div class="flex flex-row gap-4 items-center">
        <div class="flex flex-col gap-1">
          <span class="font-display text-2xl">Billing</span>
          <span class="text-sm"> Manage your organization's subscription </span>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-8 w-full overflow-y-scroll">
      <div
        class="flex flex-col gap-8 w-full"
        v-if="pending">
        Loading
      </div>
      <div
        class="flex flex-col gap-8 w-full"
        v-if="error">
        {{ error }}
      </div>
      <div class="flex flex-col gap-8 w-full">
        <div
          class="flex flex-row gap-8 w-full"
          v-if="!pending">
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
            class="flex flex-col"
            v-if="orgBillingOverview?.lifetimeUsers">
            <span class="text-sm font-medium text-base-11">Lifetime Users</span>
            <span class="text-2xl font-display">
              {{ orgBillingOverview?.lifetimeUsers }}
            </span>
          </div>
          <div
            class="flex flex-col"
            v-if="orgBillingOverview?.lifetimeUsers">
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
            label="Upgrade"
            variant="solid"
            @click="showPricingTable = true"
            v-if="!showPricingTable" />
          <div
            v-if="showPricingTable"
            class="flex flex-col gap-8 items-center">
            <div
              class="flex flex-row gap-0 items-center justify-center w-fit bg-base-3 border-1 border-base-7 p-1 rounded-lg">
              <button
                class="py-1 px-6 rounded-md"
                :class="
                  pricingTableBillingPeriod === 'monthly'
                    ? 'bg-primary-9 border-1 border-primary-7'
                    : ''
                "
                @click="pricingTableBillingPeriod = 'monthly'">
                <span class="text-xs uppercase font-semibold"> Monthly </span>
              </button>
              <button
                class="py-1 px-6 rounded-md"
                :class="
                  pricingTableBillingPeriod === 'yearly'
                    ? 'bg-primary-9 border-1 border-primary-7'
                    : ''
                "
                @click="pricingTableBillingPeriod = 'yearly'">
                <span class="text-xs uppercase font-semibold"> yearly </span>
              </button>
            </div>
            <div class="flex flex-row flex-wrap w-full gap-8 justify-center">
              <div
                class="flex flex-col gap-8 bg-base-2 border-base-7 border-1 rounded-xl p-8 min-w-xs">
                <span class="font-display text-xl leading-none">
                  Free Plan
                </span>
                <div class="flex flex-col gap-4 justify-start">
                  <div class="flex flex-row gap-2 items-center">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      Multiple users
                    </span>
                  </div>
                  <div class="flex flex-row gap-2 items-center">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      @uninbox.me email addresses
                    </span>
                  </div>
                  <div class="flex flex-row gap-2 items-center">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      Forwarding Address
                    </span>
                  </div>
                  <div class="flex flex-row gap-2 items-center">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      Unlimited Projects
                    </span>
                  </div>
                </div>
                <div class="flex flex-row gap-2 items-center">
                  <span class="font-display text-4xl leading-none">$0</span>
                  <div class="flex flex-col gap-0">
                    <span class="leading-none text-sm font-medium text-base-11"
                      >per user</span
                    >
                    <span class="leading-none text-sm font-medium text-base-11"
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
                class="flex flex-col gap-8 bg-base-2 border-base-7 border-1 rounded-xl p-8 min-w-xs">
                <span class="font-display text-xl leading-none">
                  Starter Plan
                </span>
                <div class="flex flex-col gap-4 justify-start">
                  <div class="flex flex-row gap-2 items-center">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      Everything in "Free Plan"
                    </span>
                  </div>
                  <div class="flex flex-row gap-2 items-center">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      User Groups
                    </span>
                  </div>
                  <div class="flex flex-row gap-2 items-center">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      Multiple email destinations
                    </span>
                  </div>
                  <div class="flex flex-row gap-2 items-center">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      1 Custom Domain
                    </span>
                  </div>
                </div>
                <div class="flex flex-row gap-2 items-center">
                  <span class="font-display text-4xl leading-none"
                    >${{
                      pricingTableBillingPeriod === 'yearly' ? '90' : '9'
                    }}</span
                  >
                  <div class="flex flex-col gap-0">
                    <span class="leading-none text-sm font-medium text-base-11"
                      >per user</span
                    >
                    <span class="leading-none text-sm font-medium text-base-11"
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
                class="flex flex-col gap-8 bg-base-2 border-base-7 border-1 rounded-xl p-8 min-w-xs">
                <span class="font-display text-xl leading-none">
                  Pro Plan
                </span>
                <div class="flex flex-col gap-4 justify-start">
                  <div class="flex flex-row gap-2 items-center">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      Everything in "Starter Plan"
                    </span>
                  </div>
                  <div class="flex flex-row gap-2 items-center">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      Catch-all Address
                    </span>
                  </div>
                  <div class="flex flex-row gap-2 items-center">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      Unlimited Projects
                    </span>
                  </div>
                  <div class="flex flex-row gap-2 items-center">
                    <Icon name="ph:check-circle-fill" />
                    <span class="text-base-12 text-sm leading-none">
                      Unlimited Custom Domains
                    </span>
                  </div>
                </div>
                <div class="flex flex-row gap-2 items-center">
                  <span class="font-display text-4xl leading-none"
                    >${{
                      pricingTableBillingPeriod === 'yearly' ? '120' : '12'
                    }}</span
                  >
                  <div class="flex flex-col gap-0">
                    <span class="leading-none text-sm font-medium text-base-11"
                      >per user</span
                    >
                    <span class="leading-none text-sm font-medium text-base-11"
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
            variant="solid" />
        </div>
      </div>
    </div>
  </div>
</template>
