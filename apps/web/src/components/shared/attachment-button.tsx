import { useGlobalStore } from '@/src/providers/global-store-provider';
import { Button } from '@/src/components/shadcn-ui/button';
import { Badge } from '@/src/components/shadcn-ui/badge';
import { type PrimitiveAtom, useAtom } from 'jotai';
import { useMemo, useRef, useState } from 'react';
import { type TypeId } from '@u22n/utils/typeid';
import { Plus } from '@phosphor-icons/react';
import uploadTracker from '@/src/lib/upload';
import { env } from '@/src/env';
import { toast } from 'sonner';

export type ConvoAttachmentUpload = {
  fileName: string;
  attachmentPublicId: TypeId<'convoAttachments'>;
  size: number;
  type: string;
};

type AttachmentButtonProps = {
  attachmentsAtom: PrimitiveAtom<ConvoAttachmentUpload[]>;
};

type PreSignedData = {
  publicId: TypeId<'convoAttachments'>;
  signedUrl: string;
};

const FILE_SIZE_LIMIT = 15_000_000; // 15MB

export function AttachmentButton({ attachmentsAtom }: AttachmentButtonProps) {
  const [attachments, setAttachments] = useAtom(attachmentsAtom);
  const [uploadProgress, setUploadProgress] = useState<
    { progress: number; fileName: string }[]
  >([]);
  const [processing, setProcessing] = useState(false);
  const currentOrgShortcode = useGlobalStore(
    (state) => state.currentOrg.shortcode
  );
  const uploadedAttachmentSize = useMemo(
    () => attachments.reduce((acc, { size }) => acc + size, 0),
    [attachments]
  );

  const fileDialogRef = useRef<HTMLInputElement>(null);

  const processSelectedFiles = async (files: File[]) => {
    if (files.length === 0) return;
    const newFilesSize = files.reduce((acc, { size }) => acc + size, 0);

    if (newFilesSize + uploadedAttachmentSize > FILE_SIZE_LIMIT) {
      toast.error('File size limit exceeded', {
        description: `The total size of the attachments exceeds the limit of ${FILE_SIZE_LIMIT} bytes.`
      });
      return;
    }

    setProcessing(true);
    setUploadProgress(
      files.map((file) => ({ fileName: file.name, progress: 0 }))
    );
    const results = await Promise.allSettled(
      files.map(async (file) => {
        const preSignedData = (await fetch(
          `${env.NEXT_PUBLIC_STORAGE_URL}/api/attachments/presign?orgShortcode=${currentOrgShortcode}&filename=${file.name}`,
          {
            method: 'GET',
            credentials: 'include'
          }
        ).then((res) => res.json())) as PreSignedData;
        await uploadTracker({
          formData: file,
          method: 'PUT',
          url: preSignedData.signedUrl,
          headers: {
            'Content-Type': file.type
          },
          includeCredentials: false,
          onProgress: (newProgress) => {
            setUploadProgress((prev) =>
              prev.map(({ fileName, progress }, i) =>
                i === files.indexOf(file)
                  ? { progress: newProgress, fileName }
                  : { progress, fileName }
              )
            );
          }
        });
        return {
          fileName: file.name,
          attachmentPublicId: preSignedData.publicId,
          size: file.size,
          type: file.type
        };
      })
    );
    const successfulAttachments = results
      .map((r) => (r.status === 'fulfilled' ? r.value : null))
      .filter(Boolean) as ConvoAttachmentUpload[];

    setAttachments((prev) => prev.concat(successfulAttachments));

    const failedAttachments = results
      .filter((r) => r.status === 'rejected')
      .map((_, i) => i);

    if (failedAttachments.length > 0) {
      const failedFiles = failedAttachments
        .map((i) => files[i]?.name ?? '')
        .join(', ');
      toast.error('Few files failed to upload', {
        description: `The files ${failedFiles} failed to upload. Please try again.`
      });
    }

    setProcessing(false);
    setUploadProgress([]);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <Badge
            key={attachment.attachmentPublicId}
            variant={'outline'}
            className="flex p-1">
            <span className="max-w-40 truncate">{attachment.fileName}</span>
            <Button
              variant={'secondary'}
              onClick={() => {
                setAttachments((prev) =>
                  prev.filter(
                    (att) =>
                      att.attachmentPublicId !== attachment.attachmentPublicId
                  )
                );
              }}>
              <Plus
                className="rotate-45"
                size={14}
              />
            </Button>
          </Badge>
        ))}

        {uploadProgress.map(({ progress, fileName }) => (
          <Badge
            key={fileName}
            variant="outline"
            className="flex p-1">
            <span className="max-w-40 truncate">{fileName}</span> -
            <span className="w-[7ch] text-right">{progress.toFixed(2)}%</span>
          </Badge>
        ))}
      </div>

      <Button
        variant={'outline'}
        onClick={() => fileDialogRef.current?.click()}
        loading={processing}>
        Attachment
      </Button>
      <input
        type="file"
        ref={fileDialogRef}
        multiple
        itemType="image/*"
        onChange={(e) => {
          void processSelectedFiles(Array.from(e.target.files ?? []));
        }}
        hidden
      />
    </>
  );
}
