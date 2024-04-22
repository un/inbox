'use client';

import { type ColumnDef } from '@tanstack/react-table';

type Identity = {
  address: string;
  sendName: string;
  forwardingAddress: string;
  assignedTo: string;
};

export const columns: ColumnDef<Identity>[] = [
  {
    accessorKey: 'address',
    header: 'Address'
  },
  {
    accessorKey: 'sendName',
    header: 'Send Name'
  },
  {
    accessorKey: 'forwardingAddress',
    header: 'Forwarding Address'
  },
  {
    accessorKey: 'assignedTo',
    header: 'Assigned to'
  }
];
