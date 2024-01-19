<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { z } from 'zod';
  import { useClipboard, useTimeAgo } from '@vueuse/core';

  const { copy, copied, text } = useClipboard();
  const { $trpc, $i18n } = useNuxtApp();
  const inviteEmailValid = ref<boolean | 'remote' | null>(null);
  const dnsRecordsExpanded = ref(false);
  const mailMethodsExpanded = ref(true);
  const showDnsRefreshMessage = ref(false);
  const dnsRefreshLoading = ref(false);

  const route = useRoute();

  const domainPublicId = route.params.domainId as string;
  const isNewDomain = route.query.new === 'true';

  const timeSinceLastDnsCheck = computed(() => {
    if (domainDnsQuery?.value?.checked) {
      return useTimeAgo(domainDnsQuery?.value?.checked);
    }
    return '';
  });

  const incomingForwardingModeEnabled = computed(() => {
    return domainQuery.value?.domainData?.receivingMode === 'forwarding' ||
      domainQuery.value?.domainData?.receivingMode === 'native'
      ? true
      : false;
  });
  const incomingNativeModeEnabled = computed(() => {
    return domainQuery.value?.domainData?.receivingMode === 'native'
      ? true
      : false;
  });
  const outgoingNativeModeEnabled = computed(() => {
    return domainQuery.value?.domainData?.sendingMode === 'native'
      ? true
      : false;
  });

  const {
    data: domainQuery,
    pending: domainPending,
    error: domainError,
    refresh: domainRefresh
  } = await $trpc.org.mail.domains.getDomain.useLazyQuery(
    {
      domainPublicId: domainPublicId,
      newDomain: isNewDomain
    },
    { server: false }
  );
  const {
    data: domainDnsQuery,
    pending: domainDnsPending,
    error: domainDnsError,
    refresh: domainDnsRefresh
  } = await $trpc.org.mail.domains.getDomainDns.useLazyQuery(
    {
      domainPublicId: domainPublicId,
      newDomain: isNewDomain
    },
    { server: false }
  );

  const items = [{
  label: 'Incoming',
  defaultOpen: true,
  slot: 'incoming'
}, {
  label: 'Outgoing',
  defaultOpen: true,
  slot: 'outgoing'
}];

  async function recheckDns() {
    dnsRefreshLoading.value = true;
    await domainDnsRefresh();
    await domainRefresh();
    setTimeout(() => {
      dnsRefreshLoading.value = false;
      showDnsRefreshMessage.value = true;
    }, 2000);
  }

  // TODO: If Existing SPF, Add checkbox to SPF record: "Select which senders to include" + create dynamic string- suggestion by @KumoMTA. Current behavious injects UnInbox into the string.
</script>

<template>
  <div class="h-full w-full flex flex-col items-start gap-8 p-4">
    <div class="w-full flex flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-4">
        <UnUiTooltip text="Back to domains">
          <UnUicon
            name="i-ph-arrow-left"
            size="32"
            @click="navigateTo('./')" />
        </UnUiTooltip>
        <div class="flex flex-col gap-1">
          <span
            v-if="!domainPending"
            class="text-2xl font-mono">
            {{ domainQuery?.domainData?.domain }}
          </span>
          <span
            v-if="domainPending"
            class="text-2xl font-mono">
            Loading...
          </span>
        </div>
      </div>
      <span
        v-if="!domainPending"
        class="rounded-full px-4 py-1 text-base-1 font-semibold uppercase"
        :class="
          domainQuery?.domainData?.domainStatus === 'disabled'
            ? 'bg-red-9'
            : domainQuery?.domainData?.domainStatus === 'pending'
              ? 'bg-orange-9'
              : 'bg-green-9'
        ">
        {{ domainQuery?.domainData?.domainStatus }}
      </span>
    </div>
    <div class="w-full flex flex-col gap-8 overflow-y-scroll">
      <div
        v-if="domainPending"
        class="w-full flex flex-col gap-8">
        <div class="flex flex-row items-center gap-4">
          <div class="flex flex-col gap-1">
            <span class="text-2xl font-display">Loading...</span>
            <span class="text-sm">Please wait while we load your domain</span>
          </div>
        </div>
      </div>
      <div
        v-if="!domainPending && !domainQuery?.domainData"
        class="w-full flex flex-col gap-8">
        <div class="flex flex-row items-center gap-4">
          <div class="flex flex-col gap-1">
            <span class="text-2xl font-display">Domain not found</span>
            <span class="text-sm"></span>
          </div>
        </div>
      </div>

      <div
        v-if="!domainPending && domainQuery?.domainData"
        class="w-full flex flex-col gap-8">
        <div class="flex flex-col gap-4">
          <div class="w-full border-b-1 border-base-5 pb-2">
            <span class="text-sm text-base-11 font-semibold uppercase">
              Status
            </span>
          </div>
          <div
            v-if="domainQuery?.domainData?.domainStatus === 'pending'"
            class="flex flex-col gap-0">
            <span class=""> Your domain is unverified. </span>
            <span class="">
              Create at least one DNS record below to verify your domain.
            </span>
            <span class="font-italic">
              If you have an existing mail system you want to continue using,
              you can activate 'Forwarding' mode for incoming messages.
            </span>
            <span class="font-italic">
              To do so, skip the MX Record below, but add the SPF, DKIM, and
              Return Path records to enable sending.
            </span>
          </div>
          <div
            v-if="domainQuery?.domainData?.domainStatus === 'active'"
            class="flex flex-col gap-0">
            <span class="">
              Your domain has been activated and can be used to send and receive
              as per the settings below.
            </span>
          </div>
          <div
            v-if="domainQuery?.domainData?.domainStatus === 'disabled'"
            class="flex flex-col gap-0">
            <span class="">
              Your domain has been disabled and can not be used to send or
              receive mail.
            </span>
            <span class="">
              This could have been set by an administor in your org, if you did
              not verify the domain for more than 3 days, or if your domain was
              reported for abuse or breaking our terms and conditions.
            </span>
            <span class="">
              To re-enable the domain, please contact our support team.
            </span>
          </div>
        </div>
        <div class="flex flex-col gap-4">
          <div class="w-full border-b-1 border-base-5 pb-2">
            <span class="text-sm text-base-11 font-semibold uppercase">
              Mail
            </span>
          </div>
          <NuxtUiAccordion :items="items">
          <template #incoming>
          
            <div class="flex flex-col gap-4">
            <div
              class="h-fit w-full flex flex-col justify-center gap-4 rounded-2xl bg-base-2 p-8">
             
                <span class="text-lg font-display">Incoming</span>
                <span
                  v-if="domainQuery.domainData.receivingMode === 'disabled'"
                  class="rounded-full bg-red-9 px-4 py-1 text-xs text-base-1 font-semibold uppercase">
                  Disabled
                </span>
                <span
                  v-if="
                    domainQuery.domainData.receivingMode === 'forwarding' ||
                    domainQuery.domainData.receivingMode === 'native'
                  "
                  class="rounded-full bg-orange-9 px-4 py-1 text-xs text-base-1 font-semibold uppercase">
                  Forwarding
                </span>
                <span
                  v-if="domainQuery.domainData.receivingMode === 'native'"
                  class="rounded-full bg-green-9 px-4 py-1 text-xs text-base-1 font-semibold uppercase">
                  Native
                </span>
              
              <div
               
                class="flex flex-col justify-center gap-8">
                <div v-if="domainQuery.domainData.receivingMode === 'disabled'">
                  <span class=""
                    >Incoming mail is disabled for this domain. Please verify
                    the domain by adding a DNS record to start sending
                    messages.</span
                  >
                </div>
                <div class="flex flex-col gap-2">
                  <div class="flex flex-row items-center justify-between">
                    <span class="font-semibold"> Native Mode </span>
                    <span
                      class="rounded-full bg-red-5 px-4 py-1 text-xs text-base-1 font-semibold uppercase"
                      :class="
                        incomingNativeModeEnabled ? 'bg-green-9' : 'bg-red-9'
                      ">
                      {{ incomingNativeModeEnabled ? 'enabled' : 'disabled' }}
                    </span>
                  </div>
                  <span class="">
                    All your incoming email is sent directly to UnInbox.
                  </span>
                  <span class="">
                    You can still forward in emails using the address below
                  </span>
                </div>
                <div class="flex flex-col gap-2">
                  <div class="flex flex-row items-center justify-between">
                    <span class="font-semibold"> Forwarding Mode </span>
                    <span
                      class="rounded-full bg-red-5 px-4 py-1 text-xs text-base-1 font-semibold uppercase"
                      :class="
                        incomingForwardingModeEnabled
                          ? 'bg-green-9'
                          : 'bg-red-9'
                      ">
                      {{
                        incomingForwardingModeEnabled ? 'enabled' : 'disabled'
                      }}
                    </span>
                  </div>
                  <span class="">
                    You can forward emails from any external email system to be
                    processed in UnInbox.
                  </span>
                  <span class="">
                    A single forwarding address can be used for all your
                    domain's email accounts.
                  </span>
                  <div class="mt-[8px] flex flex-col gap-1">
                    <span
                      class="overflow-hidden text-xs text-base-11 uppercase">
                      Forwarding Address
                    </span>
                    <div class="flex flex-row items-center gap-2">
                      <div
                        class="min-w-[50px] w-fit flex flex-col items-center rounded-lg bg-base-3 p-4">
                        <span
                          class="w-fit break-anywhere text-left text-sm font-mono">
                          {{ domainQuery?.domainData?.forwardingAddress }}
                        </span>
                      </div>
                      <UnUiTooltip text="Copy to clipboard">
                        <UnUiIcon
                          name="i-ph-clipboard"
                          size="20"
                          @click="
                            copy(
                              domainQuery?.domainData?.forwardingAddress || ''
                            )
                          " />
                      </UnUiTooltip>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
            
    </template>

    <template #outgoing>
      <div
              class="h-fit w-full flex flex-col justify-center gap-4 rounded-2xl bg-base-2 p-8">
             
                <span class="text-lg font-display">Outgoing</span>
                <span
                  v-if="domainQuery.domainData.sendingMode === 'disabled'"
                  class="rounded-full bg-red-9 px-4 py-1 text-xs text-base-1 font-semibold uppercase">
                  Disabled
                </span>
                <span
                  v-if="domainQuery.domainData.sendingMode === 'external'"
                  class="rounded-full bg-orange-9 px-4 py-1 text-xs text-base-1 font-semibold uppercase">
                  External
                </span>
                <span
                  v-if="domainQuery.domainData.sendingMode === 'native'"
                  class="rounded-full bg-green-9 px-4 py-1 text-xs text-base-1 font-semibold uppercase">
                  Native
                </span>
             
              <div
               
                class="flex flex-col justify-center gap-8">
                <div v-if="domainQuery.domainData.sendingMode === 'disabled'">
                  <span class="">
                    Outgoing mail is disabled for this domain. Please add the
                    SPF, DKIM and Return Path DNS records listed below.
                  </span>
                </div>
                <div class="flex flex-col gap-2">
                  <div class="flex flex-row items-center justify-between">
                    <span class="font-semibold"> Native Mode </span>
                    <span
                      class="rounded-full bg-red-5 px-4 py-1 text-xs text-base-1 font-semibold uppercase"
                      :class="
                        outgoingNativeModeEnabled ? 'bg-green-9' : 'bg-red-9'
                      ">
                      {{ outgoingNativeModeEnabled ? 'enabled' : 'disabled' }}
                    </span>
                  </div>
                  <span class="">
                    Your outgoing mail can be sent directly by UnInbox.
                  </span>
                  <span class="">
                    Receivers will be able to verify that the message came from
                    an authorized sender.
                  </span>
                </div>
                <div class="flex flex-col gap-2">
                  <div class="flex flex-row items-center justify-between">
                    <span class="font-semibold"> External Mode </span>
                    <span
                      class="rounded-full bg-red-5 bg-red-9 px-4 py-1 text-xs text-base-1 font-semibold uppercase">
                      disabled
                    </span>
                  </div>
                  <span class="">
                    Outgoing emails sent through UnInbox will be passed onto
                    separate email system for sending.
                  </span>
                  <span class="">
                    In this mode you must ensure that the sender can be verified
                    by the receiving email system.
                  </span>
                </div>
              </div>
            </div>

    
    </template>
  </NuxtUiAccordion>
          <div class="flex flex-col gap-4">
            
            
          </div>
        </div>
        <div class="flex flex-col gap-4">
          <div
            class="w-full flex flex-row justify-between border-b-1 border-base-5 pb-2">
            <span class="text-md text-base-11 font-semibold uppercase">
              DNS Records
            </span>
          </div>
          <div class="flex flex-col gap-4">
            <div class="flex flex-row items-center justify-between">
              <span class="text-xs text-base-11 font-semibold uppercase">
                Last check: {{ timeSinceLastDnsCheck }}
              </span>
              <UnUiButton
                label="Recheck DNS Records"
                size="sm"
                icon="i-ph-arrow-clockwise"
                :loading="dnsRefreshLoading"
                variant="outline"
                @click="recheckDns()" />
            </div>
            <span
              v-if="showDnsRefreshMessage"
              class="w-full text-center text-sm text-base-11">
              DNS records have been rechecked. If the records are still invalid,
              please recheck your DNS settings.
            </span>
            <SettingsDomainDnsItem
              title="MX Records"
              :valid="domainDnsQuery?.dns?.mx.valid || false"
              text="To receive email natively into UnInbox without another mail system, add an MX record with the following values. This should be the only MX record for this domain. MX records tell other email servers where to send email for your domain."
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
              ]"
              :expanded="dnsRecordsExpanded"
              @clicked="dnsRecordsExpanded = !dnsRecordsExpanded" />
            <SettingsDomainDnsItem
              title="DKIM Record"
              :valid="domainDnsQuery?.dns?.dkim.valid || false"
              text="To ensure email sent via UnInbox is delivered properly, add a TXT record with the following value. DKIM records help receivers verify the signature of an authorized sender."
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
              ]"
              :expanded="dnsRecordsExpanded"
              @clicked="dnsRecordsExpanded = !dnsRecordsExpanded" />

            <SettingsDomainDnsItem
              title="SPF Record"
              :valid="domainDnsQuery?.dns?.spf.valid || false"
              :text="
                domainDnsQuery?.dns?.spf.otherSenders &&
                domainDnsQuery?.dns?.spf.otherSenders.length > 0
                  ? ' We have detected existing email senders for your domain, to ensure email sent via UnInbox is delivered properly, modify your TXT record to the following value. We have included existing senders to make your life easier. '
                  : 'To ensure email sent via UnInbox is delivered properly, add a TXT record with the following value. SPF records help receivers verify the email came from an authorized sender.'
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
              ]"
              :expanded="dnsRecordsExpanded"
              @clicked="dnsRecordsExpanded = !dnsRecordsExpanded" />

            <SettingsDomainDnsItem
              title="Return Path"
              :valid="domainDnsQuery?.dns?.returnPath.valid || false"
              text="To add a layer of reliability for sending emails, add a CNAME record with the following values. Adding a return path record helps stop undelivered emails from spamming external services. Make sure to disable any proxy settings."
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
              ]"
              :expanded="dnsRecordsExpanded"
              @clicked="dnsRecordsExpanded = !dnsRecordsExpanded" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>