<script setup lang="ts">
  import {
    computed,
    navigateTo,
    ref,
    useNuxtApp,
    useRoute,
    watch
  } from '#imports';
  import { useTimeAgo } from '@vueuse/core';

  const orgShortCode = (useRoute().params.orgShortCode ?? '') as string;

  const { $trpc } = useNuxtApp();
  const { data: isAdmin } =
    await $trpc.org.users.members.isOrgMemberAdmin.useQuery({ orgShortCode });

  if (!isAdmin.value) {
    await navigateTo(`/${orgShortCode}/settings`);
  }

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

  const {
    data: domainQuery,
    pending: domainPending,
    refresh: domainRefresh
  } = await $trpc.org.mail.domains.getDomain.useLazyQuery(
    {
      domainPublicId: domainPublicId,
      newDomain: isNewDomain,
      orgShortCode
    },
    { server: false }
  );
  const { data: domainDnsQuery, refresh: domainDnsRefresh } =
    await $trpc.org.mail.domains.getDomainDns.useLazyQuery(
      {
        domainPublicId: domainPublicId,
        isNewDomain: isNewDomain,
        orgShortCode
      },
      { server: false }
    );

  const domainStatus = ref<'unverified' | 'pending' | 'active' | 'disabled'>(
    'pending'
  );
  const incomingForwardingModeEnabled = ref(false);
  const incomingNativeModeEnabled = ref(false);
  const outgoingNativeModeEnabled = ref(false);
  const incomingStatus = ref<'disabled' | 'native' | 'forwarding'>('disabled');
  const outgoingStatus = ref<'disabled' | 'native' | 'external'>('disabled');

  watch(
    domainQuery,

    (data) => {
      if (!data) return;
      domainStatus.value = data.domainData?.domainStatus || 'unverified';
      incomingForwardingModeEnabled.value =
        data.domainData?.receivingMode === 'forwarding' ||
        data.domainData?.receivingMode === 'native'
          ? true
          : false;
      incomingNativeModeEnabled.value =
        data.domainData?.receivingMode === 'native' ? true : false;
      outgoingNativeModeEnabled.value =
        data.domainData?.sendingMode === 'native' ? true : false;
    },
    { deep: true }
  );

  const mail = computed(() => {
    const mailStatus = [
      {
        label: 'Incoming',
        slot: 'incoming',
        status: domainQuery.value?.domainData?.receivingMode || 'disabled'
      },
      {
        label: 'Outgoing',
        slot: 'outgoing',
        status: domainQuery.value?.domainData?.sendingMode || 'disabled'
      }
    ];
    return mailStatus;
  });
  watch(
    domainDnsQuery,

    (data) => {
      if (!data) return;
      if (data.dnsStatus && data.dnsStatus.verification === true) {
        if (
          mail.value[0]?.status === 'disabled' ||
          mail.value[1]?.status === 'disabled'
        ) {
          domainStatus.value = 'pending';
        } else {
          domainStatus.value = 'active';
        }
      } else if (data.dnsStatus && data.dnsStatus.verification === false) {
        domainStatus.value = 'unverified';
      } else {
        domainStatus.value = 'pending';
      }
    },
    { deep: true }
  );

  const dns = computed(() => {
    return [
      {
        label: 'Verification',
        slot: 'verification-record',
        status: domainDnsQuery.value?.dnsStatus?.verification || false
      },
      {
        label: 'MX-Records',
        slot: 'mx-records',
        status: domainDnsQuery.value?.dnsStatus?.mxDnsValid || false
      },
      {
        label: 'DKIM-Record',
        slot: 'dkim-records',
        status: domainDnsQuery.value?.dnsStatus?.dkimDnsValid || false
      },
      {
        label: 'SPF-Record',
        slot: 'spf-record',
        status: domainDnsQuery.value?.dnsStatus?.spfDnsValid || false
      },
      {
        label: 'Return Path',
        slot: 'return-path',
        status: domainDnsQuery.value?.dnsStatus?.returnPathDnsValid || false
      },
      {
        label: 'DMARC-Record',
        slot: 'dmarc-record',
        status: domainDnsQuery.value?.dnsStatus?.dmarkPolicy || null
      }
    ];
  });

  async function recheckDns() {
    dnsRefreshLoading.value = true;
    await domainDnsRefresh();
    await domainRefresh();
    setTimeout(() => {
      dnsRefreshLoading.value = false;
      showDnsRefreshMessage.value = true;
    }, 2000);
  }

  function statusColor(
    status: 'unverified' | 'pending' | 'active' | 'disabled'
  ) {
    switch (status) {
      case 'unverified':
        return 'red';
      case 'pending':
        return 'amber';
      case 'active':
        return 'green';
      case 'disabled':
        return 'red';
    }
  }
  function mailModeColor(
    status: 'native' | 'external' | 'forwarding' | 'disabled'
  ) {
    switch (status) {
      case 'disabled':
        return 'red';
      case 'external':
        return 'amber';
      case 'forwarding':
        return 'amber';
      case 'native':
        return 'green';
    }
  }

  function dnsItemStatusColor(
    status: boolean | 'reject' | 'quarantine' | 'none' | null
  ) {
    switch (status) {
      case true:
        return 'green';
      case 'reject':
        return 'green';
      case 'quarantine':
        return 'amber';
      default:
        return 'red';
    }
  }
  function dnsItemStatusText(
    status: boolean | 'reject' | 'quarantine' | 'none' | null
  ) {
    switch (status) {
      case true:
        return 'VALID';
      case 'reject':
        return 'GREAT';
      case 'quarantine':
        return 'OK';
      case 'none':
        return 'BAD';
      default:
        return 'INVALID';
    }
  }

  // TODO: If Existing SPF, Add checkbox to SPF record: "Select which senders to include" + create dynamic string- suggestion by @KumoMTA. Current behaviors injects UnInbox into the string.
</script>

<template>
  <div class="flex h-full w-full flex-col items-start gap-8 p-4">
    <div class="flex w-full flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-4">
        <UnUiButton
          icon="i-ph-arrow-left"
          square
          variant="soft"
          @click="navigateTo(`/${orgShortCode}/settings/org/mail/domains/`)" />

        <div class="flex flex-col gap-1">
          <span
            v-if="!domainPending"
            class="font-mono text-2xl">
            {{ domainQuery?.domainData?.domain }}
          </span>
          <span
            v-if="domainPending"
            class="font-mono text-2xl">
            Loading...
          </span>
        </div>
      </div>
      <UnUiBadge
        :color="statusColor(domainStatus)"
        :label="domainStatus.toUpperCase()"
        size="lg" />
    </div>
    <div class="flex w-full flex-col gap-8 overflow-y-auto">
      <div
        v-if="domainPending"
        class="flex w-full flex-col gap-8">
        <div class="flex flex-row items-center gap-4">
          <div class="flex flex-col gap-1">
            <span class="font-display text-2xl">Loading...</span>
            <span class="text-sm">Please wait while we load your domain</span>
          </div>
        </div>
      </div>
      <div
        v-if="!domainPending && !domainQuery?.domainData"
        class="flex w-full flex-col gap-8">
        <div class="flex flex-row items-center gap-4">
          <div class="flex flex-col gap-1">
            <span class="font-display text-2xl">Domain not found</span>
            <span class="text-sm"></span>
          </div>
        </div>
      </div>

      <div
        v-if="!domainPending && domainQuery?.domainData"
        class="flex w-full flex-col gap-8">
        <div class="flex flex-col gap-4">
          <div class="border-b-1 border-base-5 w-full pb-2">
            <span class="text-base-11 text-sm font-semibold uppercase">
              Status
            </span>
          </div>
          <div
            v-if="domainStatus === 'unverified'"
            class="text-base-12 flex flex-col gap-0">
            <span class=""> Your domain is unverified. </span>
            <span class="">
              Please add the DNS records below to your domain.
            </span>
          </div>
          <div
            v-if="domainStatus === 'pending'"
            class="text-base-12 flex flex-col gap-0">
            <span class="">
              Your domain is verified, but the DNS records below are not
              configured correctly.
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
            v-if="domainStatus === 'active'"
            class="text-base-12 flex flex-col gap-0">
            <span class="">
              Your domain has been activated and can be used to send and receive
              as per the settings below.
            </span>
          </div>
          <div
            v-if="domainStatus === 'disabled'"
            class="text-base-12 flex flex-col gap-0">
            <span class="">
              Your domain has been disabled and can not be used to send or
              receive mail.
            </span>
            <span class="">
              This could have been set by an administrator in your org, if you
              did not verify the domain for more than 3 days, or if your domain
              was reported for abuse or breaking our terms and conditions.
            </span>
            <span class="">
              To re-enable the domain, please contact our support team.
            </span>
          </div>
        </div>
        <div class="flex flex-col gap-4">
          <div class="border-b-1 border-base-5 w-full pb-2">
            <span class="text-base-11 text-sm font-semibold uppercase">
              Mail
            </span>
          </div>
          <NuxtUiAccordion
            multiple
            :items="mail">
            <template #default="{ item, open }">
              <UnUiButton
                variant="soft"
                class="mb-1.5"
                :class="
                  open ? 'bg-base-5 dark:bg-base-5' : 'bg-base-3 dark:bg-base-3'
                ">
                <div
                  class="mr-4 flex w-full flex-row items-center justify-between">
                  <span class="truncate">{{ item.label }}</span>
                  <UnUiBadge
                    :color="mailModeColor(item.status)"
                    :label="item.status.toUpperCase()" />
                </div>
                <UnUiIcon
                  name="i-heroicons-chevron-down-20-solid"
                  class="ms-auto h-5 w-5 transform transition-transform duration-200"
                  :class="[open && 'rotate-90']" />
              </UnUiButton>
            </template>
            <template #incoming>
              <div class="mr-10 flex flex-col gap-4">
                <div class="flex h-fit w-full flex-col gap-4 p-3">
                  <div class="text-base-11 flex flex-col justify-center gap-8">
                    <div v-if="incomingStatus === 'disabled'">
                      <span class=""
                        >Incoming mail is disabled for this domain. Please
                        verify the domain by adding a DNS record to start
                        sending messages.</span
                      >
                    </div>
                    <div class="flex flex-col gap-2">
                      <div class="flex flex-row items-center justify-between">
                        <span class="font-semibold"> Native Mode </span>
                        <UnUiBadge
                          :color="incomingNativeModeEnabled ? 'green' : 'red'"
                          :label="
                            incomingNativeModeEnabled ? 'ENABLED' : 'DISABLED'
                          " />
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
                        <UnUiBadge
                          :color="
                            incomingForwardingModeEnabled ? 'green' : 'red'
                          "
                          :label="
                            incomingForwardingModeEnabled
                              ? 'ENABLED'
                              : 'DISABLED'
                          " />
                      </div>
                      <span class="">
                        You can forward emails from any external email system to
                        be processed in UnInbox.
                      </span>
                      <span class="">
                        A single forwarding address can be used for all your
                        domain's email accounts.
                      </span>
                      <div class="mt-[8px] flex flex-col gap-1">
                        <span
                          class="text-base-11 overflow-hidden text-xs uppercase">
                          Forwarding Address
                        </span>
                        <div class="flex flex-row items-center gap-2">
                          <div
                            class="bg-base-3 flex w-fit min-w-[50px] flex-col items-center rounded-lg p-4">
                            <span
                              class="break-anywhere w-fit text-left font-mono text-sm">
                              {{ domainQuery?.domainData?.forwardingAddress }}
                            </span>
                          </div>
                          <UnUiCopy
                            :text="
                              domainQuery?.domainData?.forwardingAddress || ''
                            " />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <template #outgoing>
              <div class="flex h-fit w-full flex-col justify-center gap-4 p-3">
                <div
                  class="text-base-11 mr-10 flex flex-col justify-center gap-8">
                  <div v-if="outgoingStatus === 'disabled'">
                    <span class="">
                      Outgoing mail is disabled for this domain. Please add the
                      SPF, DKIM and Return Path DNS records listed below.
                    </span>
                  </div>
                  <div class="flex flex-col gap-2">
                    <div class="flex flex-row items-center justify-between">
                      <span class="font-semibold"> Native Mode </span>
                      <UnUiBadge
                        :color="outgoingNativeModeEnabled ? 'green' : 'red'"
                        :label="
                          outgoingNativeModeEnabled ? 'ENABLED' : 'DISABLED'
                        " />
                    </div>
                    <span class="">
                      Your outgoing mail can be sent directly by UnInbox.
                    </span>
                    <span class="">
                      Receivers will be able to verify that the message came
                      from an authorized sender.
                    </span>
                  </div>
                  <div class="flex flex-col gap-2">
                    <div class="flex flex-row items-center justify-between">
                      <span class="font-semibold"> External Mode </span>
                      <UnUiBadge
                        color="red"
                        label="DISABLED" />
                    </div>
                    <span class="">
                      Outgoing emails sent through UnInbox will be passed onto
                      separate email system for sending.
                    </span>
                    <span class="">
                      In this mode you must ensure that the sender can be
                      verified by the receiving email system.
                    </span>
                  </div>
                </div>
              </div>
            </template>
          </NuxtUiAccordion>
        </div>
        <div class="flex flex-col gap-4">
          <div
            class="border-b-1 border-base-5 flex w-full flex-row justify-between pb-2">
            <span class="text-md text-base-11 font-semibold uppercase">
              DNS Records
            </span>
          </div>
          <div class="flex flex-col gap-4">
            <div class="flex flex-row items-center justify-between">
              <span class="text-base-11 text-xs font-semibold uppercase">
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
              class="text-base-11 w-full text-center text-sm">
              DNS records have been rechecked. If the records are still invalid,
              please recheck your DNS settings.
            </span>
            <NuxtUiAccordion
              multiple
              :items="dns">
              <template #default="{ item, open }">
                <UnUiButton
                  variant="soft"
                  class="mb-1.5"
                  :class="
                    open
                      ? 'bg-base-5 dark:bg-base-5'
                      : 'bg-base-3 dark:bg-base-3'
                  ">
                  <div
                    class="mr-4 flex w-full flex-row items-center justify-between">
                    <span class="text-base-12 truncate">{{ item.label }}</span>
                    <UnUiBadge
                      :color="dnsItemStatusColor(item.status)"
                      :label="dnsItemStatusText(item.status)" />
                  </div>
                  <UnUiIcon
                    name="i-heroicons-chevron-down-20-solid"
                    class="ms-auto h-5 w-5 transform transition-transform duration-200"
                    :class="[open && 'rotate-90']" />
                </UnUiButton>
              </template>
              <template #verification-record>
                <SettingsDomainDnsItem
                  text="This record is used to verify that you own the domain. Please do not delete the record after verification."
                  :blocks="[
                    {
                      title: 'Type',
                      value: 'TXT'
                    },
                    {
                      title: 'Name',
                      value:
                        domainDnsQuery?.dnsRecords?.verification.name || '',
                      hasCopyButton: true
                    },
                    {
                      title: 'Content',
                      value:
                        domainDnsQuery?.dnsRecords?.verification.value || '',
                      hasCopyButton: true
                    }
                  ]" />
              </template>
              <template #mx-records>
                <SettingsDomainDnsItem
                  text="To receive email natively into UnInbox without another mail system, add an MX record with the following values. This should be the only MX record for this domain. MX records tell other email servers where to send email for your domain."
                  :blocks="[
                    {
                      title: 'Type',
                      value: 'MX'
                    },
                    {
                      title: 'Name',
                      value: domainDnsQuery?.dnsRecords?.mx.name || ''
                    },
                    {
                      title: 'Priority',
                      value: `${domainDnsQuery?.dnsRecords?.mx.priority}`
                    },
                    {
                      title: 'Content',
                      value: domainDnsQuery?.dnsRecords?.mx.value || '',
                      hasCopyButton: true
                    }
                  ]" />
              </template>
              <template #dkim-records>
                <SettingsDomainDnsItem
                  text="To ensure email sent via UnInbox is delivered properly, add a TXT record with the following value. DKIM records help receivers verify the signature of an authorized sender."
                  :blocks="[
                    {
                      title: 'Type',
                      value: 'TXT'
                    },
                    {
                      title: 'Name',
                      value: domainDnsQuery?.dnsRecords?.dkim.name || '',
                      hasCopyButton: true
                    },
                    {
                      title: 'Value/Content',
                      value: domainDnsQuery?.dnsRecords?.dkim.value || '',
                      hasCopyButton: true
                    }
                  ]" />
              </template>
              <template #spf-record>
                <SettingsDomainDnsItem
                  :text="
                    domainDnsQuery?.dnsRecords?.spf.extraSenders
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
                      value: domainDnsQuery?.dnsRecords?.spf.name || ''
                    },
                    {
                      title: 'Content',
                      value: domainDnsQuery?.dnsRecords?.spf.value || '',
                      hasCopyButton: true
                    }
                  ]" />
              </template>
              <template #return-path>
                <SettingsDomainDnsItem
                  text="To add a layer of reliability for sending emails, add a CNAME record with the following values. Adding a return path record helps stop undelivered emails from spamming external services. Make sure to disable any proxy settings."
                  :blocks="[
                    {
                      title: 'Type',
                      value: 'CNAME'
                    },
                    {
                      title: 'Name',
                      value: domainDnsQuery?.dnsRecords?.returnPath.name || '',
                      hasCopyButton: true
                    },
                    {
                      title: 'Target',
                      value: domainDnsQuery?.dnsRecords?.returnPath.value || '',
                      hasCopyButton: true
                    }
                  ]" />
              </template>
              <template #dmarc-record>
                <SettingsDomainDnsItem
                  text="DMARC records help receivers verify the email came from an authorized sender. If you will only be sending email via UnInbox, add a TXT record with the following value."
                  :blocks="[
                    {
                      title: 'Type',
                      value: 'TXT'
                    },
                    {
                      title: 'Name',
                      value: domainDnsQuery?.dnsRecords?.dmarc.name || '_dmarc',
                      hasCopyButton: true
                    },
                    {
                      title: 'Value',
                      value: domainDnsQuery?.dnsRecords?.dmarc.optimal || '',
                      hasCopyButton: true
                    }
                  ]" />
                <SettingsDomainDnsItem
                  text="If you'll be sending mail from other services that dont enforce DMARC, use this record instead."
                  :blocks="[
                    {
                      title: 'Type',
                      value: 'TXT'
                    },
                    {
                      title: 'Name',
                      value: domainDnsQuery?.dnsRecords?.dmarc.name || '_dmarc',
                      hasCopyButton: true
                    },
                    {
                      title: 'Value',
                      value: domainDnsQuery?.dnsRecords?.dmarc.acceptable || '',
                      hasCopyButton: true
                    }
                  ]" />
              </template>
            </NuxtUiAccordion>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
