'use client';

import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import type { RouterOutputs } from '@/src/lib/trpc';

type EmailIdentity =
  RouterOutputs['org']['mail']['emailIdentities']['getOrgEmailIdentities']['emailIdentityData'][number];

const columnHelper = createColumnHelper<EmailIdentity>();

export const columns: ColumnDef<EmailIdentity>[] = [
  columnHelper.display({
    id: 'username',
    header: 'Username',
    cell: ({ row }) => (
      <div className="flex items-center">{row.original.username}</div>
    )
  }),
  columnHelper.display({
    id: 'domain',
    header: 'Domain',
    cell: ({ row }) => (
      <div className="flex items-center">{row.original.domainName}</div>
    )
  }),
  columnHelper.display({
    id: 'send-name',
    header: 'Send Name',
    cell: ({ row }) => (
      <div className="flex items-center">{row.original.sendName}</div>
    )
  }),
  columnHelper.display({
    id: 'destination',
    header: 'Destination',
    cell: ({ row }) => (
      <div className="flex items-center">
        {row.original.routingRules.description}
      </div>
    )
  })
];
