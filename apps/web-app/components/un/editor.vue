<script setup lang="ts">
  import { EditorContent, useEditor } from '@tiptap/vue-3';
  import StarterKit from '@tiptap/starter-kit';

  const props = defineProps<{
    modelValue: string;
  }>();

  const emit = defineEmits<{
    (e: 'update:modelValue', value?: string): void;
  }>();

  const content = useVModel(props, 'modelValue', emit);

  const editor = useEditor({
    content: content.value,
    extensions: [StarterKit],
    autofocus: true,
    editorProps: {
      attributes: {
        class:
          'max-h-full max-w-prose w-full focus:outline-none p-0 overflow-hidden'
      }
    },
    onUpdate: () => {
      emit('update:modelValue', editor.value?.getHTML());
    }
  });

  watch(content, (val) => {
    const isSame = editor.value?.getHTML() === val;
    if (isSame) return;

    editor.value?.commands.setContent(val, false);
  });
</script>

<template>
  <div
    class="h-full max-h-full w-full border border-1 border-base-6 rounded-xl bg-base-1 px-2 py-1">
    <div class="max-h-full overflow-y-scroll">
      <EditorContent :editor="editor" />
    </div>
  </div>
</template>
