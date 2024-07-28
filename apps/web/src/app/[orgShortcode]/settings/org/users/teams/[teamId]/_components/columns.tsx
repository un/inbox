'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/src/components/shadcn-ui/avatar';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { generateAvatarUrl, getInitials } from '@/src/lib/utils';
import type { RouterOutputs } from '@/src/lib/trpc';

type Member =
  // eslint-disable-next-line @typescript-eslint/ban-types
  (RouterOutputs['org']['users']['teams']['getTeam']['team'] & {})['members'][number];

const columnHelper = createColumnHelper<Member>();

export const columns: ColumnDef<Member>[] = [
  columnHelper.display({
    id: 'name',
    header: 'Name',
    cell: ({ row }) => {
      if (!row.original.orgMemberProfile) return null;
      const { publicId, avatarTimestamp, firstName, lastName } =
        row.original.orgMemberProfile;

      const avatarUrl = generateAvatarUrl({
        avatarTimestamp,
        publicId,
        size: 'lg'
      });
      const initials = getInitials(`${firstName} ${lastName}`);

      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={avatarUrl ?? undefined}
              alt={`${firstName} ${lastName}`}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span>{`${firstName} ${lastName}`}</span>
        </div>
      );
    }
  }),
  columnHelper.display({
    id: 'username',
    header: 'Username',
    cell: ({ row }) => {
      return (
        <div className="flex h-full items-center">
          @{row.original.orgMemberProfile?.handle ?? null}
        </div>
      );
    }
  }),
  columnHelper.display({
    id: 'title',
    header: 'Title',
    cell: ({ row }) => {
      return (
        <div className="flex h-full items-center">
          {row.original.orgMemberProfile?.title ?? null}
        </div>
      );
    }
  })
];
