'use client';

import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import type { RouterOutputs } from '@/src/lib/trpc';
import { generateAvatarUrl, getInitials } from '@/src/lib/utils';
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/src/components/shadcn-ui/avatar';
import { Badge } from '@/src/components/shadcn-ui/badge';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from '@/src/components/shadcn-ui/tooltip';

type Team =
  RouterOutputs['org']['users']['teams']['getOrgTeams']['teams'][number];

const columnHelper = createColumnHelper<Team>();

export const columns: ColumnDef<Team>[] = [
  columnHelper.display({
    id: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const { publicId, avatarTimestamp, name } = row.original;

      const avatarUrl = generateAvatarUrl({
        avatarTimestamp,
        publicId,
        size: 'lg'
      });
      const initials = getInitials(name);

      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={avatarUrl ?? undefined}
              alt={name}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span>{name}</span>
        </div>
      );
    }
  }),
  columnHelper.display({
    id: 'description',
    header: 'Description',
    cell: ({ row }) => {
      return (
        <div className="line-clamp-4 flex h-full items-center truncate">
          {row.original.description}
        </div>
      );
    }
  }),
  columnHelper.display({
    id: 'color',
    header: 'Color',
    cell: ({ row }) => {
      return (
        <Tooltip>
          <TooltipTrigger>
            <div
              className="size-6 rounded-full"
              style={{ backgroundColor: `var(--${row.original.color}10)` }}
            />
          </TooltipTrigger>
          <TooltipContent className="capitalize">
            {row.original.color}
          </TooltipContent>
        </Tooltip>
      );
    }
  }),
  columnHelper.display({
    id: 'member',
    header: 'Members',
    cell: ({ row }) => {
      return (
        <div className="flex h-full items-center">
          <Badge>{row.original.members.length} Members</Badge>
        </div>
      );
    }
  })
];
