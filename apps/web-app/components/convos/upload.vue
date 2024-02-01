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
    /**
     * The organization slug required for the file upload process.
     * @type {string}
     */
    orgSlug: string;
  };
  const props = defineProps<Props>();

  /**
   * Tracks the loading state of the file upload process.
   * @type {Ref<boolean>}
   */
  const loading = ref(false);

  /**
   * provides the value of attachments uploaded by the user.
   * @type {Ref<ConvoAttachmentUpload[]>}
   */
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
      const { data: preSignedData } = await useFetch<PreSignedData>(
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
      console.log({ result: preSignedData.value });
      if (
        !preSignedData.value ||
        !preSignedData.value.publicId ||
        !preSignedData.value.signedUrl
      ) {
        throw new Error('Missing attachmentPublicId or presignedUrl');
      }
      const attachmentPublicId = preSignedData.value.publicId;
      const presignedUrl = preSignedData.value.signedUrl;

      const { error } = await useFetch(presignedUrl, {
        method: 'put',
        body: file,
        headers: {
          'Content-Type': fileType
        }
      });
      if (error.value) {
        console.log({ error: error.value });
        throw new Error('Error uploading file');
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
      resetSelectedFiles();
    } finally {
      loading.value = false;
    }
  });
</script>
<template>
  <slot v-bind="{ openFileDialog, loading }" />
</template>
