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
  const mailMethodsExpanded = ref(false);
  const showDnsRefreshMessage = ref(false);

  const route = useRoute();

  const orgPublicId = route.params.orgId as string;
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
      orgPublicId: orgPublicId,
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
      orgPublicId: orgPublicId,
      domainPublicId: domainPublicId,
      newDomain: isNewDomain
    },
    { server: false }
  );

  function recheckDns() {
    domainDnsRefresh();
    showDnsRefreshMessage.value = true;
  }

  // TODO: If Existing SPF, Add checkbox to SPF record: "Select which senders to include" + create dynamic string- suggestion by @KumoMTA
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
      <span
        class="font-semibold text-base-1 uppercase py-1 px-4 rounded-full bg-red-9"
        v-if="
          !domainPending && domainQuery?.domainData?.domainStatus === 'disabled'
        ">
        {{ domainQuery?.domainData?.domainStatus }}
      </span>
      <span
        class="font-semibold text-base-1 uppercase py-1 px-4 rounded-full bg-orange-9"
        v-if="
          !domainPending && domainQuery?.domainData?.domainStatus === 'pending'
        ">
        {{ domainQuery?.domainData?.domainStatus }}
      </span>
      <span
        class="font-semibold text-base-1 uppercase py-1 px-4 rounded-full bg-green-9"
        v-if="
          !domainPending && domainQuery?.domainData?.domainStatus === 'active'
        ">
        {{ domainQuery?.domainData?.domainStatus }}
      </span>
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
            <span class="text-sm uppercase text-base-11 font-semibold">
              Status
            </span>
          </div>
          <div
            class="flex flex-col gap-0"
            v-if="domainQuery?.domainData?.domainStatus === 'pending'">
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
            class="flex flex-col gap-0"
            v-if="domainQuery?.domainData?.domainStatus === 'active'">
            <span class="">
              Your domain has been activated and can be used to send and receive
              as per the settings below.
            </span>
          </div>
          <div
            class="flex flex-col gap-0"
            v-if="domainQuery?.domainData?.domainStatus === 'disabled'">
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
            <span class="text-sm uppercase text-base-11 font-semibold">
              Mail
            </span>
          </div>
          <div class="flex flex-col gap-4">
            <div
              class="flex flex-col gap-4 justify-center p-8 bg-base-2 rounded-2xl w-full h-fit">
              <div
                class="flex flex-row justify-between items-center cursor-pointer"
                @click="mailMethodsExpanded = !mailMethodsExpanded">
                <span class="font-display text-lg">Incoming</span>
                <span
                  v-if="domainQuery.domainData.receivingMode === 'disabled'"
                  class="text-xs font-semibold text-base-1 uppercase py-1 px-4 rounded-full bg-red-9">
                  Disabled
                </span>
                <span
                  v-if="
                    domainQuery.domainData.receivingMode === 'forwarding' ||
                    domainQuery.domainData.receivingMode === 'native'
                  "
                  class="text-xs font-semibold text-base-1 uppercase py-1 px-4 rounded-full bg-orange-9">
                  Forwarding
                </span>
                <span
                  v-if="domainQuery.domainData.receivingMode === 'native'"
                  class="text-xs font-semibold text-base-1 uppercase py-1 px-4 rounded-full bg-green-9">
                  Native
                </span>
              </div>
              <div
                v-show="mailMethodsExpanded"
                class="flex flex-col gap-8 justify-center">
                <div v-if="domainQuery.domainData.receivingMode === 'disabled'">
                  <span class=""
                    >Incoming mail is disabled for this domain. Please verify
                    the domain by adding a DNS record to start sending
                    messages.</span
                  >
                </div>
                <div class="flex flex-col gap-2">
                  <div class="flex flex-row justify-between items-center">
                    <span class="font-semibold"> Native Mode </span>
                    <span
                      class="px-4 py-1 bg-red-5 rounded-full uppercase text-xs font-semibold text-base-1"
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
                  <div class="flex flex-row justify-between items-center">
                    <span class="font-semibold"> Forwarding Mode </span>
                    <span
                      class="px-4 py-1 bg-red-5 rounded-full uppercase text-xs font-semibold text-base-1"
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
                  <div class="flex flex-col gap-1 mt-[8px]">
                    <span
                      class="text-xs uppercase text-base-11 overflow-hidden">
                      Forwarding Address
                    </span>
                    <div class="flex flex-row gap-2 items-center">
                      <div
                        class="flex flex-col bg-base-3 p-4 rounded-lg w-fit min-w-[50px] items-center">
                        <span
                          class="text-sm font-mono break-anywhere text-left w-fit">
                          {{ domainQuery?.domainData?.forwardingAddress }}
                        </span>
                      </div>
                      <UnUiTooltip text="Copy to clipboard">
                        <icon
                          name="ph-clipboard"
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
            <div
              class="flex flex-col gap-4 justify-center p-8 bg-base-2 rounded-2xl w-full h-fit">
              <div
                class="flex flex-row justify-between items-center cursor-pointer"
                @click="mailMethodsExpanded = !mailMethodsExpanded">
                <span class="font-display text-lg">Outgoing</span>
                <span
                  v-if="domainQuery.domainData.sendingMode === 'disabled'"
                  class="text-xs font-semibold text-base-1 uppercase py-1 px-4 rounded-full bg-red-9">
                  Disabled
                </span>
                <span
                  v-if="domainQuery.domainData.sendingMode === 'external'"
                  class="text-xs font-semibold text-base-1 uppercase py-1 px-4 rounded-full bg-orange-9">
                  External
                </span>
                <span
                  v-if="domainQuery.domainData.sendingMode === 'native'"
                  class="text-xs font-semibold text-base-1 uppercase py-1 px-4 rounded-full bg-green-9">
                  Native
                </span>
              </div>
              <div
                v-show="mailMethodsExpanded"
                class="flex flex-col gap-8 justify-center">
                <div v-if="domainQuery.domainData.sendingMode === 'disabled'">
                  <span class="">
                    Outgoing mail is disabled for this domain. Please add the
                    SPF, DKIM and Return Path DNS records listed below.
                  </span>
                </div>
                <div class="flex flex-col gap-2">
                  <div class="flex flex-row justify-between items-center">
                    <span class="font-semibold"> Native Mode </span>
                    <span
                      class="px-4 py-1 bg-red-5 rounded-full uppercase text-xs font-semibold text-base-1"
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
                  <div class="flex flex-row justify-between items-center">
                    <span class="font-semibold"> External Mode </span>
                    <span
                      class="px-4 py-1 bg-red-5 rounded-full uppercase text-xs font-semibold text-base-1 bg-red-9">
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
          </div>
        </div>
        <div class="flex flex-col gap-4">
          <div
            class="flex flex-row justify-between w-full border-b-1 border-base-5 pb-2">
            <span class="text-md uppercase text-base-11 font-semibold">
              DNS Records
            </span>
            <span class="text-xs uppercase text-base-11 font-semibold">
              Last check: {{ timeSinceLastDnsCheck }}
            </span>
          </div>
          <div class="flex flex-col gap-4">
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
              text="To add a layer of reliability for sending emails, add a CNAME record with the following values. Adding a return path record helps stop undelivered emails from spamming external services."
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
          <UnUiButton
            label="Recheck DNS Records"
            size="sm"
            variant="outline"
            width="full"
            @click="domainDnsRefresh()" />
          <span
            class="text-sm text-base-11 w-full text-center"
            v-if="showDnsRefreshMessage">
            DNS records can take several hours update across the internet. We
            will keep checking regularly and let you know when everything is
            correct.
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
