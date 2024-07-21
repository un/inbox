import { type TypeId } from '@u22n/utils/typeid';
import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { env } from '../env';

export const cn = (...input: ClassValue[]) => twMerge(clsx(input));

export const downloadAsFile = (filename: string, content: string) => {
  const element = document.createElement('a');
  element.setAttribute(
    'href',
    'data:text/plain;charset=utf-8,' + encodeURIComponent(content)
  );
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

export const generateAvatarUrl = ({
  publicId,
  avatarTimestamp,
  size
}: {
  publicId: TypeId<'orgMemberProfile' | 'contacts' | 'teams' | 'org'>;
  avatarTimestamp: Date | null;
  size?:
    | '3xs'
    | '2xs'
    | 'xs'
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | '2xl'
    | '3xl'
    | '4xl'
    | '5xl';
}) => {
  if (!avatarTimestamp) {
    return null;
  }
  const epochTs = new Date(avatarTimestamp).getTime() / 1000;
  return `${env.NEXT_PUBLIC_STORAGE_URL}/avatar/${publicId}/${
    size ? size : '5xl'
  }?t=${epochTs}`;
};

export const getInitials = (input: string) =>
  input
    .split(/\s/)
    .map((chunk) => chunk.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

export const prettyBytes = (bytes: number) => {
  const units = ['b', 'kb', 'mb']; // we don't need gb for now
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
};

export const openFilePicker = (
  callback: (file: File[]) => void,
  options?: { multiple?: boolean; accept?: string }
) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = options?.accept ?? 'image/png, image/jpeg';
  input.multiple = options?.multiple ?? false;
  input.onchange = (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files?.length) callback(Array.from(files));
  };
  input.click();
};
