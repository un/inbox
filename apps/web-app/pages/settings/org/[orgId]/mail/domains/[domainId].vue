<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { z } from 'zod';
  import { useClipboard } from '@vueuse/core';

  const { copy, copied, text } = useClipboard();
  const { $trpc, $i18n } = useNuxtApp();
  const inviteEmailValid = ref<boolean | 'remote' | null>(null);

  const route = useRoute();

  const orgPublicId = route.params.orgId as string;
  const domainPublicId = route.params.domainId as string;
  const isNewDomain = route.query.new === 'true';

  const {
    data: domainQuery,
    pending: domainPending,
    error: domainError,
    refresh: domainRefresh
  } = await $trpc.org.mail.domains.getDomain.useLazyQuery({
    orgPublicId: orgPublicId,
    domainPublicId: domainPublicId,
    newDomain: isNewDomain
  });
  const {
    data: domainDnsQuery,
    pending: domainDnsPending,
    error: domainDnsError,
    refresh: domainDnsRefresh
  } = await $trpc.org.mail.domains.getDomainDns.useLazyQuery({
    orgPublicId: orgPublicId,
    domainPublicId: domainPublicId,
    newDomain: isNewDomain
  });
</script>

<template>
  <div class="flex flex-col w-full h-full items-start p-4 gap-8">
    <div class="flex flex-row w-full justify-between items-center">
      <div class="flex flex-row gap-4 items-center">
        <UnUiTooltip text="Back to domains">
          <icon
            name="ph-arrow-left"
            size="32"
            @click="navigateTo('./')" />
        </UnUiTooltip>
        <div class="flex flex-col gap-1">
          <span
            class="font-mono text-2xl"
            v-if="!domainPending">
            {{ domainQuery?.domainData?.domain }}
          </span>
          <span
            class="font-mono text-2xl"
            v-if="domainPending">
            Loading...
          </span>
        </div>
      </div>
    </div>
    <div class="flex flex-col gap-8 w-full overflow-y-scroll">
      <div
        class="flex flex-col gap-8 w-full"
        v-if="domainPending">
        <div class="flex flex-row gap-4 items-center">
          <div class="flex flex-col gap-1">
            <span class="font-display text-2xl">Loading...</span>
            <span class="text-sm">Please wait while we load your domain</span>
          </div>
        </div>
      </div>
      <div
        class="flex flex-col gap-8 w-full"
        v-if="!domainPending && !domainQuery?.domainData">
        <div class="flex flex-row gap-4 items-center">
          <div class="flex flex-col gap-1">
            <span class="font-display text-2xl">Domain not found</span>
            <span class="text-sm"></span>
          </div>
        </div>
      </div>

      <div
        class="flex flex-col gap-8 w-full"
        v-if="!domainPending && domainQuery?.domainData">
        <div class="flex flex-col gap-4">
          <div class="w-full border-b-1 border-base-5 pb-2">
            <span class="text-xs uppercase text-base-11 font-semibold">
              DNS Records
            </span>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <SettingsDomainDnsItem
              title="MX Records"
              :valid="domainDnsQuery?.dns?.mx.valid || false"
              text="To receive email natively into UnInbox, add an MX record with the following values. This should be the only MX record for this domain."
              :blocks="[
                {
                  title: 'Type',
                  value: 'MX'
                },
                {
                  title: 'Name',
                  value: '@'
                },
                {
                  title: 'Priority',
                  value: '1'
                },
                {
                  title: 'Hostname/content',
                  value: domainDnsQuery?.dns?.mx.value || '',
                  hasCopyButton: true
                }
              ]" />
            <SettingsDomainDnsItem
              title="SPF Record"
              :valid="domainDnsQuery?.dns?.spf.valid || false"
              :text="
                domainDnsQuery?.dns?.spf.otherSenders &&
                domainDnsQuery?.dns?.spf.otherSenders.length > 0
                  ? ' We have detected existing email senders for your domain, to ensure email sent via UnInbox is delivered properly, modify your TXT record to the following value. We have included existing senders to make your life easier. '
                  : 'To ensure email sent via UnInbox is delivered properly, add a TXT record with the following value.'
              "
              :blocks="[
                {
                  title: 'Type',
                  value: 'TXT'
                },
                {
                  title: 'Name',
                  value: '@'
                },
                {
                  title: 'Value/Content',
                  value: domainDnsQuery?.dns?.spf.value || '',
                  hasCopyButton: true
                }
              ]" />
            <SettingsDomainDnsItem
              title="DKIM Record"
              :valid="domainDnsQuery?.dns?.dkim.valid || false"
              text="You need to add a TXT record with the following values."
              :blocks="[
                {
                  title: 'Type',
                  value: 'TXT'
                },
                {
                  title: 'Name',
                  value: domainDnsQuery?.dns?.dkim.key || '',
                  hasCopyButton: true
                },
                {
                  title: 'Value/Content',
                  value: domainDnsQuery?.dns?.dkim.value || '',
                  hasCopyButton: true
                }
              ]" />

            <SettingsDomainDnsItem
              title="Return Path"
              :valid="domainDnsQuery?.dns?.returnPath.valid || false"
              text="This is optional but we recommend adding this to improve deliverability. You should add a CNAME record at {{ domainDnsQuery?.dns?.returnPath.value }} to point to the hostname below."
              :blocks="[
                {
                  title: 'Type',
                  value: 'CNAME'
                },
                {
                  title: 'Name',
                  value: domainDnsQuery?.dns?.returnPath.value || '',
                  hasCopyButton: true
                },
                {
                  title: 'Target',
                  value: domainDnsQuery?.dns?.returnPath.destination || '',
                  hasCopyButton: true
                }
              ]" />
          </div>
        </div>
        <div class="flex flex-col gap-4 w-full max-w-full">
          <div class="w-full max-w-full border-b-1 border-base-5 pb-2">
            <span class="text-xs uppercase text-base-11 font-semibold">
              Outgoing mail
            </span>
          </div>
          <div class="grid grid-cols-2 gap-4 w-full max-w-full">asdsadasd</div>
        </div>
        <div class="flex flex-col gap-4">
          <div class="w-full border-b-1 border-base-5 pb-2">
            <span class="text-xs uppercase text-base-11 font-semibold">
              Forwarding Address
            </span>
          </div>
          <div class="grid grid-cols-2">sadsad</div>
        </div>
      </div>
      <div
        class="flex flex-col gap-8 w-full"
        v-if="!domainPending">
        {{ domainQuery?.domainData }}
        {{ domainDnsQuery }}
      </div>
    </div>
  </div>
</template>
