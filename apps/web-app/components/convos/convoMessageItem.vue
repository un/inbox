<script setup lang="ts">
  import { useTimeAgo } from '@vueuse/core';
  import { tiptapHtml } from '@u22n/tiptap';
  import { tipTapExtensions } from '@u22n/tiptap/extensions';
  import { computed, inject, useNuxtApp } from '#imports';

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

  const tempColor = 'message';
  const typeClasses = computed(() => {
    switch (tempColor) {
      case 'message':
        return 'bg-base-2 dark:bg-base-2';
      default:
        return 'bg-gray-100 dark:bg-gray-900';
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
</script>
<template>
  <div
    class="flex w-full flex-col gap-2"
    :class="containerClasses">
    <div class="flex w-full flex-row items-start justify-start gap-2">
      <div
        v-if="author"
        class="flex flex-row items-center gap-1">
        <UnUiAvatar
          :public-id="author.publicId"
          :avatar-id="author.avatarPublicId"
          :alt="author.name"
          :type="author.type"
          :color="author.color"
          size="lg"
          class="rounded-full shadow-md" />
      </div>
      <div class="flex w-full flex-col gap-2 p-0">
        <div
          class="flex max-h-4 w-full flex-row items-center justify-between gap-2 overflow-visible pl-2">
          <div class="flex w-full flex-row items-end gap-2">
            <span
              v-if="author"
              class="text-sm leading-none">
              {{ author.name }}
            </span>
            <span
              v-if="props.entry.metadata?.email?.from?.[0]?.email"
              class="text-base-9 text-xs">
              - via {{ props.entry.metadata?.email.from[0].email }}</span
            >
          </div>
          <div class="flex flex-row gap-0">
            <UnUiTooltip text="Report a bug">
              <UnUiButton
                size="xs"
                square
                variant="soft"
                icon="i-ph-bug" />
            </UnUiTooltip>
            <UnUiTooltip text="View original message">
              <UnUiButton
                size="xs"
                square
                variant="soft"
                icon="i-ph-code" />
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
  </div>
</template>
