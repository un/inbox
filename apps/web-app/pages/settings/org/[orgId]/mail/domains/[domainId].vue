<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { z } from 'zod';
  import { useClipboard } from '@vueuse/core';

  const { copy, copied, text } = useClipboard();
  const { $trpc, $i18n } = useNuxtApp();

  const showInviteModal = ref(false);
  const buttonLoading = ref(false);
  const buttonLabel = ref('Create invite');
  const pageError = ref(false);
  const inviteEmailValid = ref<boolean | 'remote' | null>(null);
  const inviteEmailValue = ref('');
  const inviteEmailValidationMessage = ref('');
  const newInviteCode = ref('');
  const formValid = computed(() => {
    return inviteEmailValid.value === true;
  });

  const orgPublicId = useRoute().params.orgId as string;
  const domainPublicId = useRoute().params.domainId as string;

  const {
    data: domainQuery,
    pending,
    error,
    refresh
  } = await $trpc.org.mail.domains.getDomain.useLazyQuery({
    orgPublicId: orgPublicId,
    domainPublicId: domainPublicId
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
            v-if="!pending">
            {{ domainQuery?.domainData?.domain }}
          </span>
          <span
            class="font-mono text-2xl"
            v-if="pending">
            Loading...
          </span>
        </div>
      </div>
      <div class="flex flex-row gap-4 items-center">
        <button
          class="flex flex-row gap-2 p-2 border-1 rounded items-center justify-center border-base-7 bg-base-3 max-w-80"
          @click="showInviteModal = !showInviteModal">
          <icon
            name="ph-plus"
            size="20" />
          <p class="text-sm">Add new</p>
        </button>
      </div>
    </div>
    <div class="flex flex-col gap-8 w-full overflow-y-scroll">
      <div
        class="flex flex-col gap-8 w-full"
        v-if="pending">
        <div class="flex flex-row gap-4 items-center">
          <div class="flex flex-col gap-1">
            <span class="font-display text-2xl">Loading...</span>
            <span class="text-sm">Please wait while we load your domain</span>
          </div>
        </div>
      </div>
      <div
        class="flex flex-col gap-8 w-full"
        v-if="!pending">
        <div class="flex flex-col gap-4">
          <div class="w-full border-b-1 border-base-5 pb-2">
            <span class="text-xs uppercase text-base-11 font-semibold">
              Domain Mode
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
        <div class="flex flex-col gap-4 w-full max-w-full">
          <div class="w-full max-w-full border-b-1 border-base-5 pb-2">
            <span class="text-xs uppercase text-base-11 font-semibold">
              DNS Records
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
            <div class="flex flex-col gap-2">
              <div><span class="font-semibold text-xl">MX Records</span></div>
              <div>
                <span>
                  If you wish to receive incoming e-mail for this domain, you
                  need to add the following MX records to the domain. You don't
                  have to do this and we'll only tell you if they're set up or
                  not. Both records should be priority 10.
                </span>
              </div>
              <div class="flex flex-row gap-2">
                <pre class="bg-base-3 p-4 rounded-lg">mx.one.e.uninbox.dev</pre>
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
        v-if="!pending">
        {{ domainQuery?.domainData }}
      </div>
    </div>
  </div>
</template>
