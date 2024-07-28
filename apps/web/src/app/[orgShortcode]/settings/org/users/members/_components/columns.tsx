'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/src/components/shadcn-ui/avatar';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { generateAvatarUrl, getInitials } from '@/src/lib/utils';
import { Badge } from '@/src/components/shadcn-ui/badge';
import type { RouterOutputs } from '@/src/lib/trpc';
import { format } from 'date-fns';

type Member =
  // eslint-disable-next-line @typescript-eslint/ban-types
  (RouterOutputs['org']['users']['members']['getOrgMembers']['members'] & {})[number];

const columnHelper = createColumnHelper<Member>();

export const columns: ColumnDef<Member>[] = [
  columnHelper.display({
    id: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const { publicId, avatarTimestamp, firstName, lastName } =
        row.original.profile;

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
              alt={firstName ?? ''}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span>
            {firstName} {lastName}
          </span>
        </div>
      );
    }
  }),
  columnHelper.display({
    id: 'username',
    header: 'Username',
    cell: ({ row }) => {
      const username = row.original.profile.handle;
      return <div className="flex h-full items-center">@{username}</div>;
    }
  }),
  columnHelper.display({
    id: 'title',
    header: 'Title',
    cell: ({ row }) => {
      const title = row.original.profile.title;
      return <div className="flex h-full items-center">{title}</div>;
    }
  }),
  columnHelper.display({
    id: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const role = row.original.role;
      return (
        <div className="flex h-full items-center">
          <Badge className="uppercase">{role}</Badge>
        </div>
      );
    }
  }),
  columnHelper.display({
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <div className="flex h-full items-center">
          <Badge className="bg-green-11 uppercase">{status}</Badge>
        </div>
      );
    }
  }),
  columnHelper.display({
    id: 'joined',
    header: 'Joined',
    cell: ({ row }) => {
      const joined = row.original.addedAt;
      return (
        <div className="flex h-full items-center">
          {format(joined, 'eee, do MMM yyyy')}
        </div>
      );
    }
  })
];
