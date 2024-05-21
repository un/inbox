'use client';

import AvatarCrop from '@/src/components/avatar-crop';
import { type ModalComponent } from '@/src/hooks/use-awaitable-modal';
import uploadTracker from '@/src/lib/upload';
import { cn } from '@/src/lib/utils';
import {
  Text,
  Button,
  AlertDialog as Dialog,
  Flex,
  Progress
} from '@radix-ui/themes';
import { type TypeId } from '@u22n/utils/typeid';
import { Camera } from '@phosphor-icons/react';
import { useRef, useState } from 'react';

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
    <Dialog.Root open={open}>
      <Dialog.Content className="w-full max-w-96 p-4">
        <Dialog.Title className="mx-auto w-fit py-2">
          Change Your Avatar
        </Dialog.Title>

        <Flex
          direction="column"
          className="w-full"
          align="center"
          gap="4">
          {!editing && (
            <Button
              variant="ghost"
              size="4"
              className="aspect-square h-full max-h-[100px] w-full max-w-[100px] cursor-pointer rounded-full p-0"
              onClick={() => {
                openFilePicker();
              }}>
              <Flex
                className={cn(
                  croppedUrl ? 'bg-cover' : 'from-yellow-9 to-red-9',
                  'h-full w-full rounded-full bg-gradient-to-r *:opacity-0 *:transition-opacity *:duration-300 *:ease-in-out *:hover:opacity-100'
                )}
                style={{
                  backgroundImage: croppedUrl ? `url(${croppedUrl})` : undefined
                }}>
                <Flex
                  align="center"
                  justify="center"
                  direction="column"
                  className="bg-gray-12/50 h-full w-full rounded-full">
                  <Camera size={24} />
                  <Text
                    size="2"
                    weight="bold">
                    Upload
                  </Text>
                </Flex>
              </Flex>
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

          {croppedUrl && (
            <Button
              size="2"
              className="w-full"
              loading={uploading}
              onClick={() => {
                upload();
              }}>
              Upload
            </Button>
          )}

          {uploading && Math.floor(progress) !== 100 && (
            <>
              <Text
                size="2"
                weight="bold">
                Uploading {Math.floor(progress)}%
              </Text>
              <Progress
                className="w-full"
                value={progress}
                max={100}
              />
            </>
          )}

          {uploading && Math.floor(progress) === 100 && (
            <Text
              size="2"
              weight="bold">
              Waiting for server to process...
            </Text>
          )}

          {uploadError && (
            <Text
              size="2"
              color="red">
              {uploadError}
            </Text>
          )}

          <Button
            size="2"
            variant="ghost"
            onClick={() => onClose()}
            className="mt-4 w-full">
            Cancel
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
