'use client';

import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/src/components/shadcn-ui/badge';
import type { RouterOutputs } from '@/src/lib/trpc';

type Domain =
  RouterOutputs['org']['mail']['domains']['getOrgDomains']['domainData'][number];

const columnHelper = createColumnHelper<Domain>();

export const columns: ColumnDef<Domain>[] = [
  columnHelper.display({
    id: 'domain',
    header: 'Domain',
    cell: ({ row }) => {
      return <div className="flex items-center">{row.original.domain}</div>;
    }
  }),
  columnHelper.display({
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <div className="flex h-full w-full items-center">
        <Badge className="uppercase">{row.original.domainStatus}</Badge>
      </div>
    )
  }),
  columnHelper.display({
    id: 'sending-mode',
    header: 'Sending Mode',
    cell: ({ row }) => {
      return (
        <div className="flex h-full items-center">
          <Badge className="uppercase">{row.original.sendingMode}</Badge>
        </div>
      );
    }
  }),
  columnHelper.display({
    id: 'receiving-mode',
    header: 'ReceivingMode',
    cell: ({ row }) => {
      return (
        <div className="flex h-full items-center">
          <Badge className="uppercase">{row.original.receivingMode}</Badge>
        </div>
      );
    }
  })
];
