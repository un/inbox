<script setup lang="ts">
  /** Handles the file upload process for convo attachments.
 * example usage:
 * <ConvosUpload
      v-model:uploadedAttachments="attachments"
      :org-shortcode="orgShortcode">
      <template #default="{ openFileDialog, loading }">
        <UnUiButton
          :loading="loading"
          label="refresh"
          @click="openFileDialog" />
      </template>
    </ConvosUpload>
 */
  import { ref, useRuntimeConfig, useToast } from '#imports';
  import { type ConvoAttachmentUpload } from '~/composables/types';
  import { useFileDialog } from '@vueuse/core';

  type Props = {
    orgShortcode: string;
    maxSize: number;
    currentSize: number;
  };
  const props = withDefaults(defineProps<Props>(), {
    maxSize: 15000000, // 15MB
    currentSize: 0
  });
  const toast = useToast();

  const loading = ref(false);

  const uploadedAttachments = defineModel<ConvoAttachmentUpload[]>(
    'uploadedAttachments',
    {
      default: () => []
    }
  );

  const {
    open: openFileDialog,
    onChange: selectedFilesOnChange,
    reset: resetSelectedFiles
  } = useFileDialog({
    multiple: true
  });

  selectedFilesOnChange(async (selectedFiles) => {
    if (!selectedFiles) return;

    const totalSize = Array.from(selectedFiles).reduce((acc, file) => {
      return acc + file.size;
    }, 0);

    if (
      totalSize > props.maxSize ||
      totalSize + props.currentSize > props.maxSize
    ) {
      console.error('Total file size exceeds 20MB');
      toast.add({
        title: 'Attachments too large',
        description: 'Your attachments must be less than 20MB in total',
        icon: 'i-ph-warning',
        color: 'red',
        timeout: 5000
      });
      return;
    } else {
      loading.value = true;
    }

    const storageUrl = useRuntimeConfig().public.storageUrl;

    const uploadPromises = Array.from(selectedFiles).map(async (file: File) => {
      const fileName = file.name;
      const fileType = file.type;
      const size = file.size;

      type PreSignedData = {
        publicId: string;
        signedUrl: string;
      };
      const preSignedData = await $fetch<PreSignedData>(
        `${storageUrl}/api/attachments/presign`,
        {
          method: 'get',
          params: {
            orgShortcode: props.orgShortcode,
            filename: fileName
          },
          credentials: 'include'
        }
      );

      if (
        !preSignedData ||
        !preSignedData.publicId ||
        !preSignedData.signedUrl
      ) {
        throw new Error('Missing attachmentPublicId or presignedUrl');
      }
      const attachmentPublicId = preSignedData.publicId;
      const presignedUrl = preSignedData.signedUrl;

      try {
        await $fetch(presignedUrl, {
          method: 'put',
          body: file,
          headers: {
            'Content-Type': fileType
          }
        });
      } catch (error) {
        console.error('Error uploading file to presigned URL:', error);
        throw error; // Rethrow to handle it in the outer catch block
      }

      return {
        fileName,
        attachmentPublicId,
        size,
        type: fileType
      };
    });

    try {
      const uploadedFiles = await Promise.all(uploadPromises);
      uploadedAttachments.value.push(...uploadedFiles);
    } catch (error) {
      console.error(error);
    } finally {
      resetSelectedFiles();
      loading.value = false;
    }
    loading.value = false;
  });
</script>
<template>
  <slot v-bind="{ openFileDialog, loading }" />
</template>
