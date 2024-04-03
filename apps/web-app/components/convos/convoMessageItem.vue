<script setup lang="ts">
  import { useTimeAgo } from '@vueuse/core';
  import { tiptapHtml } from '@u22n/tiptap';
  import { tipTapExtensions } from '@u22n/tiptap/extensions';
  import { computed, inject, ref, useNuxtApp } from '#imports';

  const { $trpc } = useNuxtApp();

  type ConvoEntryDataType = Awaited<
    ReturnType<typeof $trpc.convos.entries.getConvoEntries.query>
  >['entries'];

  type ConvoEntryItem = NonNullable<ConvoEntryDataType>[number];
  type Props = {
    entry: ConvoEntryItem;
    isReplyTo: boolean;
  };

  const props = defineProps<Props>();
  const emits = defineEmits(['set-as-reply-to']);

  const participantPublicId = inject('participantPublicId');
  const convoParticipants = inject('convoParticipants');

  const timeAgo = useTimeAgo(props.entry.createdAt || new Date());

  const convoEntryBody = computed(() => {
    if (props.entry.body) {
      return tiptapHtml.generateHTML(props.entry.body, tipTapExtensions);
    }
    return '';
  });

  const author = computed(() => {
    //@ts-expect-error vue3 provide/inject types are whack to set up: https://vuejs.org/guide/typescript/composition-api#typing-provide-inject
    return convoParticipants.value.find(
      //@ts-expect-error ts dosnt know the type of this reactive string
      (participant) =>
        participant.participantPublicId == props.entry.author.publicId
    );
  });
  const userIsAuthor = computed(() => {
    //@ts-expect-error ts dosnt know the type of this reactive string
    return props.entry.author.publicId == participantPublicId.value;
  });

  const messageType = computed(() => {
    return props.entry.type;
  });

  const typeClasses = computed(() => {
    switch (messageType.value) {
      case 'message':
        return 'bg-base-2';
      case 'comment':
        return 'bg-base-4';
      default:
        return 'bg-base-1';
    }
  });
  const containerClasses = computed(() => {
    return userIsAuthor.value ? 'items-end' : 'items-start';
  });

  const convoBubbleClasses = computed(() => {
    return `${typeClasses.value}`;
  });

  function setAsReplyTo() {
    emits('set-as-reply-to');
  }

  // Raw HTML Fields

  const {
    data: rawHtmlData,
    status: rawHtmlStatus,
    execute: rawHtmlExecute
  } = $trpc.convos.entries.getConvoSingleEntryRawEmail.useLazyQuery(
    {
      convoEntryPublicId: props.entry.publicId
    },
    { immediate: false }
  );
  const entryHasRawHtml = computed(() => {
    return props.entry.rawHtml?.wipeDate ? true : false;
  });

  const showRawHtmlModalVisible = ref(false);
  const showRawHtmlModalHeaders = ref(false);

  const openRawHtmlModal = () => {
    rawHtmlExecute();
    showRawHtmlModalVisible.value = true;
  };
  const closeRawHtmlModal = () => {
    showRawHtmlModalVisible.value = false;
  };

  const actionsExpanded = ref(false);
</script>
<template>
  <div
    class="flex w-full flex-col gap-2"
    :class="containerClasses">
    <div
      class="flex w-full flex-col items-start justify-start gap-2 md:flex-row">
      <div
        v-if="author"
        class="hidden flex-row items-center gap-1 md:visible md:flex">
        <UnUiAvatar
          :public-id="author.avatarProfilePublicId"
          :avatar-timestamp="author.avatarTimestamp"
          :alt="author.name"
          :type="author.type"
          :color="author.color"
          size="lg"
          class="rounded-full shadow-md" />
      </div>
      <div
        v-else
        class="hidden flex-row items-center gap-1 md:visible md:flex">
        <UnUiAvatar
          :public-id="null"
          :avatar-timestamp="null"
          :alt="undefined"
          type="org"
          size="lg"
          class="rounded-full shadow-md" />
      </div>
      <div class="flex w-full flex-col gap-4 p-0 lg:gap-2">
        <div
          class="flex w-full flex-col items-center justify-between gap-2 overflow-visible pl-2 md:max-h-4 md:flex-row">
          <!-- mobile -->
          <div class="flex w-full flex-row items-end gap-2 md:hidden">
            <UnUiAvatar
              v-if="author"
              :public-id="author.avatarProfilePublicId"
              :avatar-timestamp="author.avatarTimestamp"
              :alt="author.name"
              :type="author.type"
              :color="author.color"
              size="md"
              class="rounded-full shadow-md" />
            <UnUiAvatar
              v-else
              :public-id="null"
              :avatar-timestamp="null"
              :alt="undefined"
              type="org"
              size="md"
              class="rounded-full shadow-md" />
            <div class="flex w-full flex-col items-start gap-2">
              <div class="flex flex-row items-center gap-2">
                <span
                  v-if="author"
                  class="text-sm leading-none">
                  {{ author.name }}
                  <UnUiIcon
                    v-if="messageType === 'comment'"
                    name="i-ph-chat-circle"
                    size="xs" />
                </span>
              </div>
              <span
                v-if="props.entry.metadata?.email?.from?.[0]?.email"
                class="text-base-9 text-xs">
                - via {{ props.entry.metadata?.email.from[0].email }}</span
              >
            </div>
            <div
              class="flex w-12 flex-row-reverse items-end gap-2 overflow-visible md:hidden">
              <div>
                <UnUiButton
                  size="xs"
                  square
                  variant="soft"
                  icon="i-ph-dots-three-vertical"
                  @click="actionsExpanded = !actionsExpanded" />
              </div>
              <div
                class="ring-base-6 bg-base-1 flex-row gap-2 rounded-md px-2 py-1 ring-1"
                :class="actionsExpanded ? 'flex' : 'hidden'">
                <UnUiTooltip
                  v-if="entryHasRawHtml"
                  text="View original message">
                  <UnUiButton
                    size="xs"
                    square
                    variant="soft"
                    icon="i-ph-code"
                    @click="openRawHtmlModal" />
                </UnUiTooltip>
                <UnUiTooltip text="Report a bug">
                  <UnUiButton
                    size="xs"
                    square
                    variant="soft"
                    icon="i-ph-bug" />
                </UnUiTooltip>
                <UnUiCopy
                  icon="i-ph-hash"
                  size="xs"
                  variant="soft"
                  color="base"
                  helper="Copy message ID"
                  :text="props.entry.publicId" />
                <UnUiTooltip text="Reply">
                  <UnUiButton
                    size="xs"
                    square
                    variant="soft"
                    icon="i-ph-arrow-bend-double-up-left"
                    :color="props.isReplyTo ? 'green' : 'base'"
                    @click="setAsReplyTo()" />
                </UnUiTooltip>
              </div>
            </div>
          </div>
          <!-- desktop -->
          <div class="hidden w-full flex-row items-end gap-2 md:flex">
            <div class="flex flex-row items-center gap-2">
              <span
                v-if="author"
                class="text-sm leading-none">
                {{ author.name }}
              </span>
              <UnUiIcon
                v-if="messageType === 'comment'"
                name="i-ph-chat-circle"
                size="xs" />
            </div>
            <span
              v-if="props.entry.metadata?.email?.from?.[0]?.email"
              class="text-base-9 text-xs">
              - via {{ props.entry.metadata?.email.from[0].email }}</span
            >
          </div>
          <!-- actions tablet -->
          <div class="hidden flex-row gap-0 md:flex">
            <UnUiTooltip
              v-if="entryHasRawHtml"
              text="View original message">
              <UnUiButton
                size="xs"
                square
                variant="soft"
                icon="i-ph-code"
                @click="openRawHtmlModal" />
            </UnUiTooltip>
            <UnUiTooltip text="Report a bug">
              <UnUiButton
                size="xs"
                square
                variant="soft"
                icon="i-ph-bug" />
            </UnUiTooltip>
            <UnUiCopy
              icon="i-ph-hash"
              size="xs"
              variant="soft"
              color="base"
              helper="Copy message ID"
              :text="props.entry.publicId" />
            <UnUiTooltip text="Reply">
              <UnUiButton
                size="xs"
                square
                variant="soft"
                icon="i-ph-arrow-bend-double-up-left"
                :color="props.isReplyTo ? 'green' : 'base'"
                @click="setAsReplyTo()" />
            </UnUiTooltip>
          </div>
        </div>
        <!-- eslint-disable vue/no-v-html -->
        <div
          class="rounded-br-x w-full overflow-hidden rounded-bl-xl p-2 shadow-md"
          :class="convoBubbleClasses"
          v-html="convoEntryBody" />
        <div class="flex flex-row justify-end">
          <UnUiTooltip :text="props.entry.createdAt.toLocaleString()">
            <span class="text-base-9 text-xs leading-none">
              {{ timeAgo }}
            </span>
          </UnUiTooltip>
        </div>
      </div>
    </div>
    <UnUiModal
      v-model="showRawHtmlModalVisible"
      :fullscreen="true">
      <template #header>
        <span class="">Original Email Message</span>
      </template>
      <div v-if="rawHtmlStatus === 'pending'">Loading...</div>
      <div
        v-else-if="rawHtmlStatus === 'error'"
        class="overflow-scroll">
        Error loading raw HTML
      </div>
      <div
        v-else-if="rawHtmlStatus === 'success'"
        class="divide-base-7 flex flex-col gap-8 divide-y-2 overflow-scroll">
        <div>
          <UnUiButton
            v-if="rawHtmlData?.rawEmailData.headers"
            :label="!showRawHtmlModalHeaders ? 'Show Headers' : 'Hide Headers'"
            @click="showRawHtmlModalHeaders = !showRawHtmlModalHeaders" />
        </div>
        <div
          v-if="showRawHtmlModalHeaders && rawHtmlData?.rawEmailData.headers">
          <template
            v-for="(value, key, index) in rawHtmlData?.rawEmailData.headers"
            :key="index">
            <div class="mb-2 grid-cols-6 gap-2">
              <span class="text-base-11 col-span-1 text-xs uppercase">
                {{ key }}:
              </span>
              <div class="col-span-5">
                <span v-if="typeof value === 'object'">
                  <template
                    v-for="(subValue, subKey, subIndex) in value"
                    :key="subIndex">
                    <span class="font-mono text-xs"
                      >{{ subKey }}: {{ subValue }}</span
                    >
                  </template>
                </span>
                <span
                  v-else
                  class="font-mono text-xs">
                  {{ value }}
                </span>
              </div>
            </div>
          </template>
          <span class="text-base-11 col-span-1 text-sm uppercase">
            END OF HEADERS
          </span>
        </div>
        <div
          v-if="rawHtmlData?.rawEmailData.wipeDate"
          class="flex flex-col gap-2">
          <span class="text-base-11 text-sm uppercase">
            Raw message will be deleted on
          </span>
          <span class="text-sm">{{ rawHtmlData?.rawEmailData.wipeDate }}</span>
        </div>
        <div
          v-if="rawHtmlData?.rawEmailData.html"
          class="mb-4 flex flex-col gap-2">
          <span class="text-base-11 text-sm uppercase"> Raw Email </span>
          <div class="relative h-0 w-full overflow-hidden pb-[60%]">
            <iframe
              sandbox=""
              class="absolute left-0 top-0 h-full w-full border-0"
              title="HTML Email Content"
              :srcdoc="`<style>body { font-family: Arial, Helvetica, sans-serif; }</style>${rawHtmlData?.rawEmailData.html}`"></iframe>
          </div>
        </div>
      </div>
      <UnUiButton
        label="Close"
        @click="closeRawHtmlModal()" />
    </UnUiModal>
  </div>
</template>
