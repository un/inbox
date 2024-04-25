<script setup lang="ts">
  import { useClipboard, useTimeAgo } from '@vueuse/core';
  import { tiptapHtml } from '@u22n/tiptap';
  import { tipTapExtensions } from '@u22n/tiptap/extensions';
  import { computed, inject, ref, useNuxtApp } from '#imports';
  import type { VerticalNavigationLink } from '#ui/types';
  import type { ComputedRef } from 'vue';

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
    const emptyBody =
      '<span class="text-base-11 text-sm">THIS MESSAGE CONTAINS NO VALID TEXT CONTENT</span>';
    if (props.entry.body) {
      const htmlBody = tiptapHtml.generateHTML(
        props.entry.body,
        tipTapExtensions
      );
      return htmlBody !== '<p></p>' ? htmlBody : emptyBody;
    }
    return emptyBody;
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

  const messageTypeClasses = {
    message: {
      author: 'bg-blue-10 text-white',
      participant: 'bg-base-5 text-base-12'
    },
    comment: {
      author: 'bg-blue-4 text-black',
      participant: 'bg-base-4 text-black'
    },
    draft: {
      author: 'bg-base-1',
      participant: ''
    }
  };

  const typeClasses = computed(() => {
    const accessElement = userIsAuthor.value ? 'author' : 'participant';
    return messageTypeClasses[messageType.value][accessElement];
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

  const { copy } = useClipboard();

  const actionLinks: ComputedRef<VerticalNavigationLink[]> = computed(() =>
    [
      {
        label: 'Reply',
        icon: 'i-ph-arrow-bend-double-up-left',
        badge: props.isReplyTo
          ? {
              color: 'green',
              label: 'Replying',
              variant: 'subtle',
              size: 'xs'
            }
          : undefined,
        click: setAsReplyTo
      },
      entryHasRawHtml.value &&
        ({
          label: 'View original message',
          icon: 'i-ph-code',
          click: openRawHtmlModal
        } as VerticalNavigationLink | false),
      {
        label: 'Copy message ID',
        icon: 'i-ph-hash',
        click: copy(props.entry.publicId)
      },
      {
        label: 'Report a bug',
        icon: 'i-ph-bug'
      }
    ].filter((link): link is VerticalNavigationLink => Boolean(link))
  );
</script>
<template>
  <div
    class="flex w-full flex-col gap-2"
    :class="containerClasses">
    <div
      class="flex w-full flex-col items-start justify-start gap-2"
      :class="userIsAuthor ? 'md:flex-row-reverse' : 'md:flex-row'">
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
          class="rounded-full" />
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
          class="rounded-full" />
      </div>
      <div class="flex w-full flex-col gap-4 overflow-hidden p-0 lg:gap-2">
        <div
          class="flex w-full flex-col items-center justify-start gap-2 overflow-visible pl-2 md:max-h-4 md:flex-row"
          :class="userIsAuthor ? 'md:flex-row-reverse' : 'md:flex-row'">
          <!-- mobile -->
          <div class="flex w-full items-end justify-center gap-2 md:hidden">
            <UnUiAvatar
              v-if="author"
              :public-id="author.avatarProfilePublicId"
              :avatar-timestamp="author.avatarTimestamp"
              :alt="author.name"
              :type="author.type"
              :color="author.color"
              size="md"
              class="rounded-full" />
            <UnUiAvatar
              v-else
              :public-id="null"
              :avatar-timestamp="null"
              :alt="undefined"
              type="org"
              size="md"
              class="rounded-full" />
            <div class="flex w-full flex-col items-start gap-2">
              <div
                class="flex items-center gap-2"
                :class="userIsAuthor ? 'flex-row-reverse ' : 'flex-row '">
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
          <div
            class="hidden flex-row gap-2 md:flex"
            :class="
              userIsAuthor
                ? 'items-end justify-end'
                : 'items-start justify-start'
            ">
            <div class="flex items-center gap-2">
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
          <div class="hidden flex-row gap-1 md:flex">
            <UnUiPopover
              :popper="{ placement: 'bottom' }"
              :ui="{ container: 'z-50', strategy: 'override' }">
              <UnUiButton
                size="xs"
                square
                variant="ghost"
                icon="i-ph-dots-three" />

              <template #panel="{ close }">
                <div class="p-1">
                  <UnUiVerticalNavigation
                    :links="actionLinks"
                    @click="close" />
                </div>
              </template>
            </UnUiPopover>
          </div>
        </div>
        <!-- eslint-disable vue/no-v-html -->
        <div
          class="w-full max-w-full overflow-clip break-words rounded-2xl p-2 px-4"
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
