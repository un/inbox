<script setup lang="ts">
  import { tiptapVue3 } from '@u22n/tiptap';
  import { tipTapExtensions } from '@u22n/tiptap/extensions';

  const props = defineProps<{
    modelValue: tiptapVue3.JSONContent;
  }>();

  const emit = defineEmits<{
    (e: 'update:modelValue', value?: tiptapVue3.JSONContent): void;
  }>();

  const content = useVModel(props, 'modelValue', emit);

  const editor = tiptapVue3.useEditor({
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
    class="border-1 border-base-6 bg-base-1 h-full max-h-full w-full rounded-xl border px-2 py-1">
    <tiptapVue3.EditorContent
      :editor="editor"
      class="h-full max-h-full overflow-y-auto" />
  </div>
</template>
