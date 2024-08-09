'use client';

import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { CopyButton } from '@/src/components/copy-button';
import { Badge } from '@/src/components/shadcn-ui/badge';
import type { RouterOutputs } from '@/src/lib/trpc';
import { Avatar } from '@/src/components/avatar';
import { format } from 'date-fns';
import { env } from '@/src/env';

type Member =
  RouterOutputs['org']['users']['invites']['viewInvites']['invites'][number];

const columnHelper = createColumnHelper<Member>();

export const columns: ColumnDef<Member>[] = [
  columnHelper.display({
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <div className="flex h-full w-full items-center">
        <Badge className="uppercase">
          {row.original.acceptedAt ? 'Used' : 'Pending'}
        </Badge>
      </div>
    )
  }),
  columnHelper.display({
    id: 'user',
    header: 'User',
    cell: ({ row }) => {
      const { publicId, avatarTimestamp, firstName, lastName } =
        row.original.orgMember?.profile ?? {};

      return (
        <div className="flex items-center gap-2">
          <Avatar
            avatarProfilePublicId={publicId ?? 'no_avatar'}
            avatarTimestamp={avatarTimestamp ?? null}
            name={`${firstName ?? ''} ${lastName ?? ''}`}
          />
          <span className="whitespace-nowrap text-xs">{`${firstName} ${lastName}`}</span>
        </div>
      );
    }
  }),
  columnHelper.display({
    id: 'invite-code',
    header: 'Invite Code',
    cell: ({ row }) => {
      const inviteCode = row.original.inviteToken;
      return inviteCode ? (
        <div className="flex w-full max-w-36 items-center justify-between gap-2">
          <span className="truncate">{inviteCode}</span>
          <CopyButton
            text={inviteCode}
            iconSize={12}
          />
        </div>
      ) : null;
    }
  }),
  columnHelper.display({
    id: 'invite-link',
    header: 'Invite Link',
    cell: ({ row }) => {
      const inviteCode = row.original.inviteToken;
      return inviteCode ? (
        <div className="flex w-full max-w-36 items-center justify-between gap-2">
          <span className="truncate">{`${env.NEXT_PUBLIC_WEBAPP_URL}/join/invite/${inviteCode}`}</span>

          <CopyButton
            text={`${env.NEXT_PUBLIC_WEBAPP_URL}/join/invite/${inviteCode}`}
            iconSize={12}
          />
        </div>
      ) : null;
    }
  }),
  columnHelper.display({
    id: 'email',
    header: 'Email',
    cell: ({ row }) => {
      const email = row.original.email;
      return (
        <div className="flex h-full w-full max-w-36 items-center">
          <span className="truncate">{email}</span>
        </div>
      );
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
    id: 'admin',
    header: 'Admin',
    cell: ({ row }) => {
      const { publicId, avatarTimestamp, firstName, lastName } =
        row.original.invitedByOrgMember.profile;
      return (
        <div className="flex items-center justify-center gap-2">
          <Avatar
            avatarProfilePublicId={publicId ?? 'no_avatar'}
            avatarTimestamp={avatarTimestamp ?? null}
            name={`${firstName ?? ''} ${lastName ?? ''}`}
          />
        </div>
      );
    }
  }),
  columnHelper.display({
    id: 'expiry',
    header: 'Expiry',
    cell: ({ row }) => {
      const expiry = row.original.expiresAt;
      return expiry ? (
        <div className="flex h-full items-center whitespace-nowrap">
          {format(expiry, 'eee, do MMM yyyy')}
        </div>
      ) : null;
    }
  })
];
