import { createImageUpload } from '@u22n/tiptap/extensions/image-uploader';
import { type TypeId } from '@u22n/utils/typeid';
import { useOrgShortcode } from './use-params';
import uploadTracker from '../lib/upload';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { env } from '../env';

export function useInlineUploader(sizeValidate?: (file: File) => boolean) {
  const orgShortcode = useOrgShortcode();

  const uploader = useMemo(
    () =>
      createImageUpload({
        validateFn: (file) => {
          if (!file.type.startsWith('image/')) {
            toast.error('Unsupported file type. Please upload an image.');
            return false;
          }
          if (sizeValidate && !sizeValidate(file)) {
            toast.error(
              `Your are crossing the total attachment size limit, try uploading a smaller image.`
            );
            return false;
          }
          return true;
        },
        onUpload: async (file) => {
          const presignedData = (await fetch(
            `${env.NEXT_PUBLIC_STORAGE_URL}/api/attachments/presign?orgShortcode=${orgShortcode}&filename=${file.name}`,
            {
              method: 'GET',
              credentials: 'include'
            }
          ).then((res) => res.json())) as {
            publicId: TypeId<'convoAttachments'>;
            signedUrl: string;
          };
          return new Promise((resolve, reject) => {
            toast.promise(
              uploadTracker({
                formData: file,
                method: 'PUT',
                url: presignedData.signedUrl,
                headers: {
                  'Content-Type': file.type
                },
                includeCredentials: false
              }).then(() => {
                const image = new Image();
                image.src = `${env.NEXT_PUBLIC_STORAGE_URL}/inline-proxy/${orgShortcode}/${presignedData.publicId}/${file.name}?type=${encodeURIComponent(file.type)}&size=${file.size}`;
                image.onload = () => {
                  resolve(image.src);
                };
                image.onerror = () => {
                  reject(new Error('Failed to load image'));
                };
              }),
              {
                loading: 'Uploading Image',
                success: 'Uploaded',
                error: 'Upload failed'
              }
            );
          });
        }
      }),
    [orgShortcode, sizeValidate]
  );

  return uploader;
}
