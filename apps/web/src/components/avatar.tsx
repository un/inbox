'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn, generateAvatarUrl, getInitials } from '@/src/lib/utils';
import { type TypeId, inferTypeId } from '@u22n/utils/typeid';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from './shadcn-ui/tooltip';
import {
  Avatar as AvatarShad,
  AvatarFallback,
  AvatarImage
} from './shadcn-ui/avatar';
import {
  AddressBook,
  BuildingOffice,
  User,
  UsersThree
} from '@phosphor-icons/react';

export type AvatarProps = {
  avatarProfilePublicId: TypeId<
    'orgMemberProfile' | 'org' | 'teams' | 'contacts'
  >;
  avatarTimestamp: Date | null;
  name: string;
  hideTooltip?: boolean;
  tooltipOverride?: string;
} & VariantProps<typeof avatarVariants>;

const avatarVariants = cva(
  'flex items-center justify-center font-medium aspect-square bg-base-5 text-base-11 h-6 w-6 text-sm rounded-md',
  {
    variants: {
      size: {
        sm: 'h-4 w-4 text-[9px] rounded-sm',
        md: 'h-6 w-6 text-xs rounded-md',
        lg: 'h-8 w-8 text-sm rounded-lg',
        xl: 'h-10 w-10 text-md rounded-lg'
      },
      color: {
        base: 'bg-base-5 text-base-11',
        bronze: 'bg-bronze-5 text-bronze-11',
        gold: 'bg-gold-5 text-gold-11',
        brown: 'bg-brown-5 text-brown-11',
        orange: 'bg-orange-5 text-orange-11',
        tomato: 'bg-tomato-5 text-tomato-11',
        red: 'bg-red-5 text-red-11',
        ruby: 'bg-ruby-5 text-ruby-11',
        crimson: 'bg-crimson-5 text-crimson-11',
        pink: 'bg-pink-5 text-pink-11',
        plum: 'bg-plum-5 text-plum-11',
        purple: 'bg-purple-5 text-purple-11',
        violet: 'bg-violet-5 text-violet-11',
        iris: 'bg-iris-5 text-iris-11',
        indigo: 'bg-indigo-5 text-indigo-11',
        blue: 'bg-blue-5 text-blue-11',
        cyan: 'bg-cyan-5 text-cyan-11',
        teal: 'bg-teal-5 text-teal-11',
        jade: 'bg-jade-5 text-jade-11',
        green: 'bg-green-5 text-green-11',
        grass: 'bg-grass-5 text-grass-11'
      }
    },
    defaultVariants: {
      size: 'md',
      color: 'base'
    }
  }
);

export function Avatar(props: AvatarProps) {
  const avatarUrl =
    generateAvatarUrl({
      publicId: props.avatarProfilePublicId,
      avatarTimestamp: props.avatarTimestamp,
      size: props.size ?? 'lg'
    }) ?? '';
  const altText = props.name;
  const withoutTooltip = props.hideTooltip ?? false;

  function AvatarIcon() {
    const type = inferTypeId(props.avatarProfilePublicId);
    switch (type) {
      case 'orgMemberProfile':
        return <User className="h-4 w-4" />;
      case 'org':
        return <BuildingOffice className="h-4 w-4" />;
      case 'teams':
        return <UsersThree className="h-4 w-4" />;
      case 'contacts':
        return <AddressBook className="h-4 w-4" />;
      default:
        return null;
    }
  }

  return withoutTooltip ? (
    <AvatarShad
      className={cn(
        avatarVariants({ color: props.color, size: props.size }),
        ''
      )}>
      <AvatarImage
        src={avatarUrl}
        alt={altText}
      />
      <AvatarFallback>{getInitials(altText)}</AvatarFallback>
    </AvatarShad>
  ) : (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="w-fit">
          <AvatarShad
            className={cn(
              avatarVariants({ color: props.color, size: props.size }),
              ''
            )}>
            <AvatarImage
              src={avatarUrl}
              alt={altText}
            />
            <AvatarFallback>{getInitials(altText)}</AvatarFallback>
          </AvatarShad>
        </TooltipTrigger>
        <TooltipContent className="flex flex-row gap-2">
          <AvatarIcon />
          {altText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
