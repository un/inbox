<script setup lang="ts">
  import { useVirtualList, useInfiniteScroll, useTimeAgo } from '@vueuse/core';
  const { $trpc } = useNuxtApp();
  type PromiseType<T> = T extends Promise<infer U> ? U : never;
  type ConvoMessageDataType = PromiseType<
    ReturnType<typeof $trpc.convos.getConvoMessages.query>
  >['messages'];

  const noMessagesError = ref(false);
  //@ts-expect-error
  const el = ref<HTMLElement>(null);
  const messagesArray = ref<ConvoMessageDataType>([]);

  type Props = {
    convoPublicId: string;
  };

  const props = defineProps<Props>();

  const convoMessagesReturn = await $trpc.convos.getConvoMessages.query({
    convoPublicId: props.convoPublicId
  });

  if (convoMessagesReturn.error || !convoMessagesReturn.messages) {
    noMessagesError.value = true;
  } else {
    if (messagesArray.value) {
      for (const message of convoMessagesReturn.messages) {
        messagesArray.value.push({
          ...message
        });
      }
    }
  }

  // const { list, containerProps, wrapperProps } = useVirtualList(messages, {
  //   itemHeight: 152,
  //   overscan: 3
  // });
  useInfiniteScroll(
    el,
    () => {
      // load more
    },
    { distance: 300 }
  );
</script>
<template>
  <div
    class="max-w-full w-full h-full max-h-full overflow-y-scroll flex flex-col-reverse">
    <div
      class="flex flex-col-reverse items-start gap-4 mb-[24px] mt-[24px] w-full">
      <div
        v-for="message of messagesArray"
        class="max-w-full w-full">
        <convos-convo-message-item :message="message" />
      </div>
    </div>
  </div>
</template>
