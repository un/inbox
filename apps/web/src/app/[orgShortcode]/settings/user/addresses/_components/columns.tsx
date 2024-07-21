'use client';

import { ScrollArea, ScrollBar } from '@/src/components/shadcn-ui/scroll-area';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { CopyButton } from '@/src/components/copy-button';
import { Avatar } from '@/src/components/avatar';
import type { TypeId } from '@u22n/utils/typeid';

type Identity = {
  publicId: TypeId<'emailIdentitiesPersonal'>;
  org: {
    publicId: TypeId<'org'>;
    name: string;
    avatarTimestamp: Date | null;
    shortcode: string;
  };
  emailIdentity: {
    publicId: TypeId<'emailIdentities'>;
    username: string;
    forwardingAddress: string | null;
    domainName: string;
    sendName: string | null;
  };
};

const columnHelper = createColumnHelper<Identity>();

export const columns: ColumnDef<Identity>[] = [
  columnHelper.display({
    id: 'address',
    header: 'Address',
    cell: ({ row }) => {
      const identity = row.original.emailIdentity;
      return (
        <div className="flex items-center">
          {identity.username}@{identity.domainName}
        </div>
      );
    }
  }),
  columnHelper.display({
    id: 'sendName',
    header: 'Send Name',
    cell: ({ row }) => {
      const identity = row.original.emailIdentity;
      return <span>{identity.sendName ?? 'None'}</span>;
    }
  }),
  columnHelper.display({
    id: 'forwardingAddress',
    header: 'Forwarding Address',
    cell: ({ row }) => {
      const identity = row.original.emailIdentity;
      return (
        <div className="flex items-center justify-center gap-2">
          <ScrollArea
            className="w-32"
            type="hover">
            <span>{identity.forwardingAddress ?? 'None'}</span>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          {identity.forwardingAddress && (
            <CopyButton
              text={identity.forwardingAddress}
              iconSize={12}
            />
          )}
        </div>
      );
    }
  }),
  columnHelper.display({
    id: 'assignedTo',
    header: 'Assigned to',
    cell: ({ row }) => {
      const org = row.original.org;
      return (
        <div className="flex flex-row items-center gap-1">
          <Avatar
            avatarProfilePublicId={org.publicId}
            avatarTimestamp={org.avatarTimestamp}
            name={org.name}
            size="sm"
          />
          <span>{org.name}</span>
        </div>
      );
    }
  })
];
