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
        class: 'max-w-prose w-full focus:outline-none p-2 overflow-hidden'
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
  <div class="w-full bg-base-1 border border-1 border-base-6 rounded-xl p-4">
    <div class="max-h-[350px] overflow-y-scroll">
      <EditorContent :editor="editor" />
    </div>
  </div>
</template>
