<script setup lang="ts">
  import { EditorContent, useEditor, type JSONContent } from '@tiptap/vue-3';
  import { tipTapExtensions } from '../../shared/editorConfig';

  const props = defineProps<{
    modelValue: JSONContent;
  }>();

  const emit = defineEmits<{
    (e: 'update:modelValue', value?: JSONContent): void;
  }>();

  const content = useVModel(props, 'modelValue', emit);

  const editor = useEditor({
    content: content.value,
    extensions: tipTapExtensions,
    autofocus: true,
    editorProps: {
      attributes: {
        class:
          'max-h-full w-full focus:outline-none p-0 overflow-hidden h-full *:max-w-prose'
      }
    },
    onUpdate: () => {
      emit('update:modelValue', editor.value?.getJSON());
    }
  });

  watch(content, (val) => {
    const isSame = editor.value?.getJSON() === val;
    if (isSame) return;

    editor.value?.commands.setContent(val, false);
  });
</script>

<template>
  <div
    class="h-full max-h-full w-full border border-1 border-base-6 rounded-xl bg-base-1 px-2 py-1">
    <EditorContent
      :editor="editor"
      class="h-full max-h-full overflow-y-scroll" />
  </div>
</template>
