<script setup lang="ts">
  import { type JSONContent, Editor, EditorContent } from '@u22n/tiptap/vue';
  import { tipTapExtensions } from '@u22n/tiptap/extensions';
  import { useVModel } from '@vueuse/core';
  import { onUnmounted } from '#imports';

  import {
    ToolbarRoot,
    ToolbarToggleGroup,
    ToolbarToggleItem
  } from 'radix-vue';

  const props = defineProps<{
    modelValue: JSONContent;
    class?: string;
  }>();

  const emit = defineEmits<{
    (e: 'update:modelValue', value?: JSONContent): void;
  }>();

  const content = useVModel(props, 'modelValue', emit);

  const editor = new Editor({
    content: content.value,
    extensions: tipTapExtensions,
    editorProps: {
      attributes: {
        class: `max-h-full w-full focus:outline-none p-0 overflow-hidden h-full *:max-w-prose ${props.class}`
      }
    },
    onUpdate: () => {
      emit('update:modelValue', editor.getJSON());
    }
  });

  onUnmounted(() => {
    editor.destroy();
  });

  // TODO: We don't remember why this piece of code is here
  // But this breaks the editor
  // Remove it if current date is past 24th April 2024

  // watch(content, (val) => {
  //   const isSame = editor.value?.getJSON() === val;
  //   if (isSame) return;
  //   editor.value?.commands.setContent(val, false);
  // });
</script>

<template>
  <div
    class="border-1 border-base-6 bg-base-1 flex h-full max-h-full w-full flex-col rounded-md border px-2 py-1">
    <ToolbarRoot
      class="border-base-4 bg-base-1 flex w-full !min-w-max max-w-[610px] items-center rounded-md border p-1"
      aria-label="Formatting options">
      <ToolbarToggleGroup
        type="multiple"
        aria-label="Text formatting">
        <ToolbarToggleItem
          class="text-mauve-11 hover:bg-green-3 hover:text-grass-11 focus:shadow-green-7 data-[state=on]:bg-green-5 data-[state=on]:text-grass-11 ml-0.5 inline-flex h-[25px] flex-shrink-0 flex-grow-0 basis-auto items-center justify-center rounded bg-white px-[5px] text-[13px] leading-none outline-none first:ml-0 focus:relative"
          value="bold"
          aria-label="Bold"
          :disabled="!editor.can().chain().focus().toggleBold().run()"
          :pressed="editor.isActive('bold')"
          @click="editor.chain().focus().toggleBold().run()">
          <UnUiIcon
            name="i-ph-text-bolder"
            class="h-4 w-4"
            size="26" />
        </ToolbarToggleItem>
        <ToolbarToggleItem
          class="text-mauve-11 hover:bg-green-3 hover:text-grass-11 focus:shadow-green-7 data-[state=on]:bg-green-5 data-[state=on]:text-grass-11 ml-0.5 inline-flex h-[25px] flex-shrink-0 flex-grow-0 basis-auto items-center justify-center rounded bg-white px-[5px] text-[13px] leading-none outline-none first:ml-0 focus:relative"
          value="italic"
          aria-label="Italic"
          :disabled="!editor.can().chain().focus().toggleItalic().run()"
          :pressed="editor.isActive('italic')"
          @click="editor.chain().focus().toggleItalic().run()">
          <UnUiIcon
            name="i-ph-text-italic"
            class="h-4 w-4"
            size="26" />
        </ToolbarToggleItem>
        <ToolbarToggleItem
          class="text-mauve-11 hover:bg-green-3 hover:text-grass-11 focus:shadow-green-7 data-[state=on]:bg-green-5 data-[state=on]:text-grass-11 ml-0.5 inline-flex h-[25px] flex-shrink-0 flex-grow-0 basis-auto items-center justify-center rounded bg-white px-[5px] text-[13px] leading-none outline-none first:ml-0 focus:relative"
          value="strikethrough"
          aria-label="Strike through"
          :disabled="!editor.can().chain().focus().toggleStrike().run()"
          :pressed="editor.isActive('strike')"
          @click="editor.chain().focus().toggleStrike().run()">
          <UnUiIcon
            name="i-ph-text-strikethrough"
            class="h-4 w-4"
            size="26" />
        </ToolbarToggleItem>
        <ToolbarToggleItem
          class="text-mauve-11 hover:bg-green-3 hover:text-grass-11 focus:shadow-green-7 data-[state=on]:bg-green-5 data-[state=on]:text-grass-11 ml-0.5 inline-flex h-[25px] flex-shrink-0 flex-grow-0 basis-auto items-center justify-center rounded bg-white px-[5px] text-[13px] leading-none outline-none first:ml-0 focus:relative"
          value="underline"
          aria-label="Underline"
          :disabled="!editor.can().chain().focus().toggleUnderline().run()"
          :pressed="editor.isActive('underline')"
          @click="editor.chain().focus().toggleUnderline().run()">
          <UnUiIcon
            name="i-ph-text-underline"
            class="h-4 w-4"
            size="26" />
        </ToolbarToggleItem>
        <ToolbarToggleItem
          class="text-mauve-11 hover:bg-green-3 hover:text-grass-11 focus:shadow-green-7 data-[state=on]:bg-green-5 data-[state=on]:text-grass-11 ml-0.5 inline-flex h-[25px] flex-shrink-0 flex-grow-0 basis-auto items-center justify-center rounded bg-white px-[5px] text-[13px] leading-none outline-none first:ml-0 focus:relative"
          value="superscript"
          aria-label="Superscript"
          :disabled="!editor.can().chain().focus().toggleSuperscript().run()"
          :pressed="editor.isActive('superscript')"
          @click="editor.chain().focus().toggleSuperscript().run()">
          <UnUiIcon
            name="i-mdi-format-superscript"
            class="h-4 w-4"
            size="26" />
        </ToolbarToggleItem>
        <ToolbarToggleItem
          class="text-mauve-11 hover:bg-green-3 hover:text-grass-11 focus:shadow-green-7 data-[state=on]:bg-green-5 data-[state=on]:text-grass-11 ml-0.5 inline-flex h-[25px] flex-shrink-0 flex-grow-0 basis-auto items-center justify-center rounded bg-white px-[5px] text-[13px] leading-none outline-none first:ml-0 focus:relative"
          value="subscript"
          aria-label="subscript"
          :disabled="!editor.can().chain().focus().toggleSubscript().run()"
          :pressed="editor.isActive('subscript')"
          @click="editor.chain().focus().toggleSubscript().run()">
          <UnUiIcon
            name="i-mdi-format-subscript"
            class="h-4 w-4"
            size="26" />
        </ToolbarToggleItem>
      </ToolbarToggleGroup>
    </ToolbarRoot>

    <EditorContent
      :editor="editor"
      class="h-full min-h-8 flex-1" />
  </div>
</template>
