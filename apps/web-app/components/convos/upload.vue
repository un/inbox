<script setup lang="ts">
  /** Handles the file upload process for convo attachments.
 * example usage:
 * <ConvosUpload
      v-model:uploadedAttachments="attachments"
      :org-slug="orgSlug">
      <template #default="{ openFileDialog, loading }">
        <UnUiButton
          :loading="loading"
          label="refresh"
          @click="openFileDialog" />
      </template>
    </ConvosUpload>
 */
  import { useFileDialog } from '@vueuse/core';

  type Props = {
    orgSlug: string;
  };
  const props = defineProps<Props>();

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
    loading.value = true;

    const storageUrl = useRuntimeConfig().public.storageUrl;

    const uploadPromises = Array.from(selectedFiles).map(async (file: File) => {
      const filename = file.name;
      const fileType = file.type;

      type PreSignedData = {
        publicId: string;
        signedUrl: string;
      };
      const preSignedData = await $fetch<PreSignedData>(
        `${storageUrl}/api/attachments/presign`,
        {
          method: 'get',
          params: {
            orgSlug: props.orgSlug,
            filename: filename
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
        filename,
        attachmentPublicId
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
  });
</script>
<template>
  <slot v-bind="{ openFileDialog, loading }" />
</template>
