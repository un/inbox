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
              Incoming mail
            </span>
          </div>
          <div class="grid grid-cols-2 gap-8">
            <div class="flex flex-col">
              <div><span class="font-semibold text-xl">Native</span></div>
              <div>
                <span> Your incoming mail is sent directly to UnInbox. </span>
              </div>
              <div class="flex flex-col gap-4 justify-center">
                <div class="flex flex-row justify-between items-center">
                  <span class="font-semibold text-lg">MX Records</span>
                  <span
                    class="text-sm text-base-11 py-1 px-4 rounded-full bg-red-9">
                    INVALID
                  </span>
                </div>
                <div>
                  <span>
                    You need remove any existing MX records from your domain's
                    DNS configuration and add the following record.
                  </span>
                  <span> </span>
                </div>
                <div class="flex flex-row gap-4">
                  <div class="flex flex-col gap-1">
                    <span class="text-xs uppercase text-base-11"> Type </span>
                    <span
                      class="bg-base-3 p-4 rounded-lg text-sm font-mono uppercase w-[50px] text-center">
                      MX
                    </span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <span class="text-xs uppercase text-base-11"> Name </span>
                    <span
                      class="bg-base-3 p-4 rounded-lg text-sm font-mono lowercase w-[50px] text-center">
                      @
                    </span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <span class="text-xs uppercase text-base-11">
                      Priority
                    </span>
                    <span
                      class="bg-base-3 p-4 rounded-lg text-sm font-mono lowercase w-[50px] text-center">
                      1
                    </span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <span
                      class="text-xs uppercase text-base-11 overflow-hidden">
                      Hostname/content
                    </span>
                    <span
                      class="bg-base-3 p-4 rounded-lg text-sm font-mono lowercase text-left w-fit">
                      mx.one.e.uninbox.dev
                    </span>
                  </div>
                  <UnUiTooltip text="Copy to clipboard">
                    <icon
                      name="ph-clipboard"
                      size="20"
                      @click="
                        copy('v=spf1 a mx include:spf.one.e.uninbox.dev ~all')
                      " />
                  </UnUiTooltip>
                </div>
              </div>
            </div>
            <div class="flex flex-col">
              <div><span class="font-semibold text-xl">Forwarding</span></div>
              <div>
                <span>
                  Your incoming mail is sent to an external service, then
                  forwarded into UnInbox.
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-4 w-full max-w-full">
          <div class="w-full max-w-full border-b-1 border-base-5 pb-2">
            <span class="text-xs uppercase text-base-11 font-semibold">
              Outgoing mail
            </span>
          </div>
          <div class="grid grid-cols-2 gap-4 w-full max-w-full">
            <div class="flex flex-col w-full max-w-full">
              <div><span class="font-semibold text-xl">DKIM Record</span></div>
              <div>
                <span>
                  You need to add a TXT record with the following values.
                </span>
              </div>
              <span> Record Name: </span>
              <div class="flex flex-row gap-2">
                <pre class="bg-base-3 p-4 rounded-lg">
postal-zzDoQW._domainkey</pre
                >
                <UnUiTooltip text="Copy to clipboard">
                  <icon
                    name="ph-clipboard"
                    size="20"
                    @click="
                      copy('v=spf1 a mx include:spf.one.e.uninbox.dev ~all')
                    " />
                </UnUiTooltip>
              </div>
              <span> Record Value: </span>
              <div class="flex flex-row gap-2 w-full max-w-full">
                <span class="bg-base-3 p-4 rounded-lg break-anywhere">
                  v=DKIM1; t=s; h=sha256;
                  p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQChr6qa3G2cHJeLEfEFzcnSUpR8rhFIByRAeTPWCsKVDB7k2g6HPcQrFwtG/nYX3CC1iKler4YYhv3P1vBIwy4Hiu/2O8AbF9e1xYzykHjemhAF4F7/9IKX8iRu4sGKRpcPg6Xg6wBKM1JHe+uFuV0gKAsVeGSvKgjyyxNjhgcbCQIDAQAB;
                </span>
                <UnUiTooltip
                  text="Copy to clipboard"
                  class="">
                  <icon
                    name="ph-clipboard"
                    size="20"
                    @click="
                      copy('v=spf1 a mx include:spf.one.e.uninbox.dev ~all')
                    "
                    class="" />
                </UnUiTooltip>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <div><span class="font-semibold text-xl">SPF Record</span></div>
              <div>
                <span>
                  You need to add a TXT record at the apex/root of your domain
                  (@) with the following content. If you already send mail from
                  another service, you may just need to add
                  include:spf.one.e.uninbox.dev to your existing record.
                </span>
              </div>
              <div class="flex flex-row gap-2">
                <pre class="bg-base-3 p-4 rounded-lg">
v=spf1 a mx include:spf.one.e.uninbox.dev ~all</pre
                >
                <UnUiTooltip text="Copy to clipboard">
                  <icon
                    name="ph-clipboard"
                    size="20"
                    @click="
                      copy('v=spf1 a mx include:spf.one.e.uninbox.dev ~all')
                    " />
                </UnUiTooltip>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <div><span class="font-semibold text-xl">Return Path</span></div>
              <div>
                <span>
                  This is optional but we recommend adding this to improve
                  deliverability. You should add a CNAME record at
                  psrp.dev.unin.me to point to the hostname below.
                </span>
              </div>
              <div class="flex flex-row gap-2">
                <pre class="bg-base-3 p-4 rounded-lg">rp.one.e.uninbox.dev</pre>
                <UnUiTooltip text="Copy to clipboard">
                  <icon
                    name="ph-clipboard"
                    size="20"
                    @click="
                      copy('v=spf1 a mx include:spf.one.e.uninbox.dev ~all')
                    " />
                </UnUiTooltip>
              </div>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-4">
          <div class="w-full border-b-1 border-base-5 pb-2">
            <span class="text-xs uppercase text-base-11 font-semibold">
              Forwarding Address
            </span>
          </div>
          <div class="grid grid-cols-2">
            <div class="flex flex-col">
              <div><span class="font-semibold text-xl">Native</span></div>
              <div>
                <span> Your email is managed natively in UnInbox. </span>
              </div>
            </div>
            <div class="flex flex-col">
              <div><span class="font-semibold text-xl">Forwarding</span></div>
              <div>
                <span> Your email is managed by an external service. </span>
              </div>
            </div>
          </div>
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
