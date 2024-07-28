import { type TypeId } from '@u22n/utils/typeid';
import { uploadTracker } from '@/src/lib/upload';
import { useCallback, useState } from 'react';
import { env } from '../env';

type AvatarUploaderOptions = {
  onUploaded?: (response: { avatarTimestamp: Date }) => void;
  onError?: (error: Error) => void;
};

export function useAvatarUploader({
  onError,
  onUploaded
}: AvatarUploaderOptions = {}) {
  const [uploadResponse, setUploadResponse] = useState<{
    avatarTimestamp: Date;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const upload = useCallback(
    ({
      type,
      publicId,
      file
    }: {
      type: 'orgMember' | 'org' | 'contacts' | 'teams';
      publicId: TypeId<'org' | 'orgMemberProfile' | 'contacts' | 'teams'>;
      file: File;
    }) => {
      setUploading(true);
      const formData = new FormData();
      formData.append('type', type);
      formData.append('publicId', publicId);
      formData.append('file', file);
      setUploadResponse(null);
      setProgress(0);
      uploadTracker({
        formData,
        method: 'POST',
        url: `${env.NEXT_PUBLIC_STORAGE_URL}/api/avatar`,
        onProgress: (progress) => {
          setProgress(progress);
        }
      })
        .then((data) => {
          const response = JSON.parse(data as string) as {
            avatarTimestamp: Date;
          };
          setUploadResponse(response);
          onUploaded?.(response);
          setUploading(false);
        })
        .catch((e) => {
          setUploadResponse(null);
          setError(e as Error);
          onError?.(e as Error);
          setUploading(false);
        });
    },
    [onError, onUploaded]
  );

  return {
    upload,
    uploadResponse,
    uploading,
    progress,
    error
  };
}
