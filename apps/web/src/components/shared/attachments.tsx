import {
  FileDoc,
  FileJpg,
  FilePdf,
  FilePng,
  FilePpt,
  FileTxt,
  FileXls,
  FileZip,
  File,
  X
} from '@phosphor-icons/react';
import { useGlobalStore } from '../../providers/global-store-provider';
import { type VariantProps, cva } from 'class-variance-authority';
import { useCallback, useMemo, useState } from 'react';
import { cn, prettyBytes } from '../../lib/utils';
import { type TypeId } from '@u22n/utils/typeid';
import uploadTracker from '../../lib/upload';
import { env } from '@/src/env';
import { toast } from 'sonner';

export type Attachment = {
  filename: string;
  size: number;
  type: string;
  publicId: TypeId<'convoAttachments'>;
  uploadComplete: boolean;
  progress: number;
};

export type ConvoAttachmentUpload = {
  fileName: string;
  attachmentPublicId: TypeId<'convoAttachments'>;
  size: number;
  type: string;
};

const FILE_SIZE_LIMIT = 15_000_000; // 15MB

export function toTrpcUploadFormat(attachments: Attachment[]) {
  return attachments
    .filter((attachment) => attachment.uploadComplete)
    .map(({ filename, publicId, size, type }) => ({
      fileName: filename,
      attachmentPublicId: publicId,
      size,
      type
    })) as ConvoAttachmentUpload[];
}

export function useAttachmentUploader(defaultList?: Attachment[]) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const [attachments, setAttachments] = useState(defaultList ?? []);
  const totalAttachmentSize = useMemo(
    () => attachments.reduce((acc, { size }) => acc + size, 0),
    [attachments]
  );
  const [prefetching, setPrefetching] = useState(false);

  const canUpload = useCallback(
    (file: File | File[]) => {
      const files = Array.isArray(file) ? file : [file];
      const newFilesSize = files.reduce((acc, { size }) => acc + size, 0);
      return newFilesSize + totalAttachmentSize <= FILE_SIZE_LIMIT;
    },
    [totalAttachmentSize]
  );

  const internalUploader = useCallback(
    async (file: File) => {
      setPrefetching(true);
      const preSignedData = (await fetch(
        `${env.NEXT_PUBLIC_STORAGE_URL}/api/attachments/presign?orgShortcode=${orgShortcode}&filename=${file.name}`,
        {
          method: 'GET',
          credentials: 'include'
        }
      ).then((res) => res.json())) as {
        publicId: TypeId<'convoAttachments'>;
        signedUrl: string;
      };
      setPrefetching(false);

      setAttachments((prev) =>
        prev.concat({
          filename: file.name,
          size: file.size,
          type: file.type,
          publicId: preSignedData.publicId,
          uploadComplete: false,
          progress: 0
        })
      );

      await uploadTracker({
        formData: file,
        method: 'PUT',
        url: preSignedData.signedUrl,
        headers: {
          'Content-Type': file.type
        },
        includeCredentials: false,
        onProgress: (newProgress) => {
          setAttachments((prev) =>
            prev.map((v, i) =>
              i ===
              prev.findIndex(
                ({ publicId }) => publicId === preSignedData.publicId
              )
                ? { ...v, progress: newProgress }
                : v
            )
          );
        }
      })
        .then(() => {
          setAttachments((prev) =>
            prev.map((v, i) =>
              i ===
              prev.findIndex(
                ({ publicId }) => publicId === preSignedData.publicId
              )
                ? { ...v, uploadComplete: true }
                : v
            )
          );
        })
        .catch(() => {
          // Remove the attachment from the list if upload fails
          setAttachments((prev) =>
            prev.filter(({ publicId }) => publicId !== preSignedData.publicId)
          );
          // Throw an error to be caught by the parent function
          throw new Error(`Failed to upload attachment ${file.name}`);
        });
    },
    [orgShortcode]
  );

  const uploadAttachments = useCallback(
    async (files: File | File[]) => {
      files = Array.isArray(files) ? files : [files];
      if (!files.length) return;
      if (!canUpload(files)) {
        toast.error('File size limit exceeded', {
          description: `The total size of the attachments exceeds the limit of ${prettyBytes(FILE_SIZE_LIMIT)}`
        });
        return;
      }
      const results = await Promise.allSettled(files.map(internalUploader));
      const failedUploads = results.filter(
        (r) => r.status === 'rejected'
      ).length;

      if (failedUploads > 0) {
        toast.error(
          `${failedUploads} attachment${failedUploads > 1 ? 's' : ''} failed to upload`,
          {
            description: 'Please try uploading the attachments again.'
          }
        );
      }
    },
    [internalUploader, canUpload]
  );

  const removeAttachment = useCallback(
    (publicId: TypeId<'convoAttachments'>) => {
      setAttachments((prev) =>
        prev.filter((attachment) => attachment.publicId !== publicId)
      );
    },
    [setAttachments]
  );

  const removeAllAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const isUploadInProgress = useMemo(
    () =>
      prefetching ||
      attachments.some((attachment) => !attachment.uploadComplete),
    [prefetching, attachments]
  );

  const getTrpcUploadFormat = useCallback(
    () => toTrpcUploadFormat(attachments),
    [attachments]
  );

  type FilePickerOptions = {
    accept?: string;
    multiple?: boolean;
  };
  /**
   * Opens the file picker dialog to select files to upload, and uploads them
   */
  const openFilePicker = useCallback(
    (options?: FilePickerOptions) => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.multiple = options?.multiple ?? true;
      fileInput.accept = options?.accept ?? '*/*';
      fileInput.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files) {
          await uploadAttachments(Array.from(files));
        }
      };
      fileInput.click();
    },
    [uploadAttachments]
  );

  function AttachmentArray({ attachments }: { attachments: Attachment[] }) {
    const completedAttachments = useMemo(
      () => attachments.filter((attachment) => attachment.uploadComplete),
      [attachments]
    );
    const pendingAttachments = useMemo(
      () => attachments.filter((attachment) => !attachment.uploadComplete),
      [attachments]
    );

    return (
      <div className="flex w-full flex-wrap gap-2">
        {completedAttachments.map((attachment) => {
          const attachmentBlockData = {
            name: attachment.filename,
            publicId: attachment.publicId,
            type: attachment.type
          };
          return (
            <AttachmentBlock
              attachment={attachmentBlockData}
              key={attachment.publicId}
              removeAttachment={removeAttachment}
            />
          );
        })}

        {pendingAttachments.map((attachment) => {
          const attachmentBlockData = {
            name: attachment.filename,
            publicId: attachment.publicId,
            type: attachment.type,
            progress: attachment.progress
          };
          return (
            <AttachmentBlock
              attachment={attachmentBlockData}
              key={attachment.publicId}
              removeAttachment={removeAttachment}
            />
          );
        })}
      </div>
    );
  }

  return {
    attachments,
    AttachmentArray,
    totalAttachmentSize,
    isUploadInProgress,
    canUpload,
    openFilePicker,
    uploadAttachments,
    removeAttachment,
    removeAllAttachments,
    getTrpcUploadFormat
  };
}

export type UseAttachmentUploaderReturn = ReturnType<
  typeof useAttachmentUploader
>;

type AttachmentBlockProps = {
  name: string;
  type: string;
  publicId: TypeId<'convoAttachments'>;
  progress?: number;
};

function AttachmentBlock({
  attachment,
  removeAttachment
}: {
  attachment: AttachmentBlockProps;
  removeAttachment: UseAttachmentUploaderReturn['removeAttachment'];
}) {
  const fileType = attachment.type.split('/')[1] ?? attachment.type;
  const fileNameClean = attachment.name.split('.')[0] ?? attachment.name;
  const fileNameShort =
    fileNameClean.length > 12
      ? `${fileNameClean.slice(0, 12)}...`
      : fileNameClean;

  const iconClasses = cva(
    'bg-accent-9 text-accent-1 flex h-8 w-8 items-center justify-center rounded-sm',
    {
      variants: {
        color: {
          pdf: 'bg-red-9 text-red-1',
          ppt: 'bg-pink-9 text-pink-1',
          zip: 'bg-amber-9 text-amber-1',
          txt: 'bg-base-9 text-base-1',
          doc: 'bg-blue-9 text-blue-1',
          xls: 'bg-green-9 text-green-1',
          png: 'bg-iris-9 text-iris-1',
          jpg: 'bg-iris-9 text-iris-1',
          jpeg: 'bg-iris-9 text-iris-1',
          misc: 'bg-accent-9 text-accent-1'
        }
      },
      defaultVariants: {
        color: 'misc'
      }
    }
  );
  type IconClassProps = VariantProps<typeof iconClasses>;

  const AttachmentTypeIcon = () => {
    switch (fileType) {
      case 'pdf':
        return <FilePdf />;
      case 'ppt':
        return <FilePpt />;
      case 'zip':
        return <FileZip />;
      case 'txt':
        return <FileTxt />;
      case 'doc':
        return <FileDoc />;
      case 'xls':
        return <FileXls />;
      case 'png':
        return <FilePng />;
      case 'jpg':
        return <FileJpg />;
      case 'jpeg':
        return <FileJpg />;
      default:
        return <File />;
    }
  };

  const progress = useMemo(() => {
    return attachment.progress?.toFixed(0) ?? false;
  }, [attachment.progress]);

  return (
    <div
      className="group relative w-fit p-1"
      key={attachment.publicId}>
      <div className="border-base-6 group-hover:bg-base-3 flex flex-row gap-2 rounded-md border px-2 py-1.5">
        <div
          className={cn(
            iconClasses({ color: fileType as IconClassProps['color'] })
          )}>
          <AttachmentTypeIcon />
        </div>
        <div className="flex flex-col gap-0">
          <span className="text-xs font-medium">{fileNameShort}</span>
          <span className="text-base-11 text-[10px] uppercase">{fileType}</span>
          <div
            className={cn(
              progress
                ? `absolute bottom-1 left-1 right-1 top-1 mr-0 flex flex-row items-end gap-0 rounded-md transition-all duration-200 ease-in-out`
                : 'hidden'
            )}>
            <div
              className="bg-accent-9 bottom-0 left-0 h-1 w-full rounded-md rounded-r-none opacity-100"
              style={{
                maxWidth: `${progress}%`,
                width: `${progress}%`
              }}>
              {''}
            </div>
            <div
              className="bg-accent-9 h-full rounded-md rounded-l-none opacity-50 backdrop-blur-sm backdrop-sepia"
              style={{
                maxWidth: `calc(100% - ${progress}%)`,
                width: `calc(100% - ${progress}%)`
              }}>
              {''}
            </div>
          </div>
          {/* {attachment.progress && (
            <span className="text-base-11 text-[8px]">
              {attachment.progress.toFixed(2)}%
            </span>
          )} */}
        </div>
      </div>

      <div
        className={cn(
          !progress
            ? 'border-base-1 bg-base-6 hover:bg-red-3 absolute right-0 top-0 hidden h-4 w-4 cursor-pointer items-center justify-center rounded-full border group-hover:flex'
            : 'hidden'
        )}
        onClick={() => removeAttachment(attachment.publicId)}>
        <X className="h-2 w-2" />
      </div>
    </div>
  );
}
