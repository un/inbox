'use client';

import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { ScrollArea, Text, Flex } from '@radix-ui/themes';
import type { TypeId } from '@u22n/utils';
import CopyButton from '@/components/copy-button';

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
      return (
        <Text color={identity.sendName ? undefined : 'gray'}>
          {identity.sendName ?? 'None'}
        </Text>
      );
    }
  }),
  columnHelper.display({
    id: 'forwardingAddress',
    header: 'Forwarding Address',
    cell: ({ row }) => {
      const identity = row.original.emailIdentity;
      return (
        <Flex
          gap="2"
          align="center"
          justify="center">
          <ScrollArea
            scrollbars="horizontal"
            className="w-32"
            type="hover">
            <Text color={identity.forwardingAddress ? undefined : 'gray'}>
              {identity.forwardingAddress ?? 'None'}
            </Text>
          </ScrollArea>
          {identity.forwardingAddress && (
            <CopyButton
              text={identity.forwardingAddress}
              size={12}
            />
          )}
        </Flex>
      );
    }
  }),
  columnHelper.display({
    id: 'assignedTo',
    header: 'Assigned to',
    cell: ({ row }) => {
      const org = row.original.org;
      return <Flex className="flex items-center">{org.name}</Flex>;
    }
  })
];
