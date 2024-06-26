'use client';

import AvatarCrop from '@/src/components/avatar-crop';
import { type ModalComponent } from '@/src/hooks/use-awaitable-modal';
import uploadTracker from '@/src/lib/upload';
import { cn } from '@/src/lib/utils';
import { type TypeId } from '@u22n/utils/typeid';
import { Camera } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '../shadcn-ui/dialog';
import { Button } from '../shadcn-ui/button';
import { Progress } from '../shadcn-ui/progress';

export function AvatarModal({
  open,
  onClose,
  onResolve,
  publicId
}: ModalComponent<
  {
    publicId: TypeId<'orgMemberProfile' | 'org' | 'contacts' | 'teams'>;
  },
  string
>) {
  const [file, setFile] = useState<File | null>(null);
  const [editing, setEditing] = useState(false);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const croppedFile = useRef<Blob | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const openFilePicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;
    input.onchange = () => {
      if (input.files?.length) {
        setFile(input.files[0]!);
        setCroppedUrl(null);
        setEditing(true);
      }
    };
    input.click();
  };

  const upload = () => {
    if (!croppedFile.current) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', croppedFile.current);
    formData.append(
      'type',
      publicId.startsWith('omp_')
        ? 'orgMember'
        : publicId.startsWith('o_')
          ? 'org'
          : publicId.startsWith('k_')
            ? 'contact'
            : 'team'
    );
    formData.append('publicId', publicId);
    uploadTracker({
      formData,
      method: 'POST',
      url: `${process.env.NEXT_PUBLIC_STORAGE_URL}/api/avatar`,
      onProgress: (e) => {
        setProgress(e);
      }
    })
      .then((resp) => {
        try {
          const jsonRes = JSON.parse(resp as string) as {
            avatarTimestamp: string;
          };
          onResolve(jsonRes.avatarTimestamp);
        } catch (err) {
          setUploadError((err as Error)?.message);
        }
      })
      .catch((err: Error) => {
        console.error(err);
        setUploadError(err.message);
      })
      .finally(() => {
        setUploading(false);
      });
  };

  return (
    <Dialog open={open}>
      <DialogContent className="w-full max-w-96 p-4">
        <DialogTitle className="mx-auto w-fit py-2">
          Change Your Avatar
        </DialogTitle>

        <div className="flex w-full flex-col items-center justify-center gap-2 p-2">
          {!editing && (
            <Button
              variant="secondary"
              className="aspect-square h-full max-h-[100px] w-full max-w-[100px] cursor-pointer rounded-full p-0"
              onClick={() => {
                openFilePicker();
              }}>
              <div
                className={cn(
                  croppedUrl ? 'bg-cover' : 'from-accent-9 to-base-9',
                  'flex h-full w-full flex-col rounded-full bg-gradient-to-r *:opacity-0 *:transition-opacity *:duration-300 *:ease-in-out *:hover:opacity-100'
                )}
                style={{
                  backgroundImage: croppedUrl ? `url(${croppedUrl})` : undefined
                }}>
                <div className="bg-gray-5 flex h-full w-full flex-col items-center justify-center rounded-full">
                  <Camera size={24} />
                  <span className="text-sm">Upload</span>
                </div>
              </div>
            </Button>
          )}

          {file && editing && (
            <AvatarCrop
              input={file}
              onCrop={(e) => {
                croppedFile.current = e;
                const url = URL.createObjectURL(e);
                setCroppedUrl(url);
                setEditing(false);
              }}
              onCancel={() => {
                setFile(null);
                setEditing(false);
              }}
            />
          )}

          {uploading && Math.floor(progress) !== 100 && (
            <>
              <span className="text-sm">Uploading {Math.floor(progress)}%</span>
              <Progress
                className="w-full"
                value={progress}
                max={100}
              />
            </>
          )}

          {uploading && Math.floor(progress) === 100 && (
            <span className="text-sm">Waiting for server to process...</span>
          )}

          {uploadError && (
            <span className="text-red-9 text-sm">{uploadError}</span>
          )}
          <div className="flex w-full flex-row items-center justify-between gap-2">
            <Button
              variant="secondary"
              onClick={() => onClose()}
              className="mt-4 w-full">
              Cancel
            </Button>
            {croppedUrl && (
              <Button
                className="w-full"
                loading={uploading}
                onClick={() => {
                  upload();
                }}>
                Upload
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
