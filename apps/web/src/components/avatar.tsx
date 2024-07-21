'use client';

import {
  AddressBook,
  At,
  BuildingOffice,
  Dot,
  User,
  UsersThree
} from '@phosphor-icons/react';
import {
  Avatar as AvatarShad,
  AvatarFallback,
  AvatarImage
} from './shadcn-ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from './shadcn-ui/tooltip';
import { cn, generateAvatarUrl, getInitials } from '@/src/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { type TypeId, inferTypeId } from '@u22n/utils/typeid';
import * as React from 'react';

export type AvatarProps = {
  avatarProfilePublicId:
    | 'no_avatar'
    | TypeId<'orgMemberProfile' | 'org' | 'teams' | 'contacts'>;
  avatarTimestamp: Date | null;
  name: string;
  hideTooltip?: boolean;
  tooltipOverride?: string;
} & VariantProps<typeof avatarVariants>;

const avatarVariants = cva(
  'flex items-center justify-center font-medium aspect-square bg-base-5 text-base-11 h-6 w-6 text-sm rounded-md overflow-hidden',
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
        accent: 'bg-accent-5 text-accent-11',
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
      color: 'accent'
    }
  }
);

export function Avatar(props: AvatarProps) {
  const avatarUrl =
    props.avatarProfilePublicId === 'no_avatar'
      ? undefined
      : generateAvatarUrl({
          publicId: props.avatarProfilePublicId,
          avatarTimestamp: props.avatarTimestamp,
          size: props.size ?? 'lg'
        }) ?? '';
  const altText = props.name;
  const withoutTooltip = props.hideTooltip ?? false;

  return withoutTooltip ? (
    <div className={cn(avatarVariants({ size: props.size }), 'relative')}>
      <AvatarShad
        className={avatarVariants({ color: props.color, size: props.size })}>
        <AvatarImage
          src={avatarUrl}
          alt={altText}
        />
        <AvatarFallback>{getInitials(altText)}</AvatarFallback>
      </AvatarShad>
    </div>
  ) : (
    <Tooltip>
      <TooltipTrigger className="w-fit">
        <AvatarShad
          className={avatarVariants({
            color: props.color,
            size: props.size
          })}>
          <AvatarImage
            src={avatarUrl}
            alt={altText}
          />
          <AvatarFallback>{getInitials(altText)}</AvatarFallback>
        </AvatarShad>
      </TooltipTrigger>
      <TooltipContent className="flex flex-col gap-1">
        {altText}
        <AvatarIcon
          avatarProfilePublicId={props.avatarProfilePublicId}
          size="xs"
          withDot
        />
      </TooltipContent>
    </Tooltip>
  );
}

const avatarIconVariants = cva('', {
  variants: {
    size: {
      xs: 'text-[10px]',
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-md',
      xl: 'text-lg'
    }
  },
  defaultVariants: {
    size: 'md'
  }
});

type AvatarIconProps = {
  avatarProfilePublicId:
    | 'no_avatar'
    | TypeId<'orgMemberProfile' | 'org' | 'teams' | 'contacts'>;
  withDot?: boolean;
  address?: string;
} & VariantProps<typeof avatarIconVariants>;

export function AvatarIcon(iconProps: AvatarIconProps) {
  const type =
    iconProps.avatarProfilePublicId === 'no_avatar'
      ? 'email'
      : inferTypeId(iconProps.avatarProfilePublicId);
  const AvatarTypeIcon = () => {
    switch (type) {
      case 'orgMemberProfile':
        return <User />;
      case 'org':
        return <BuildingOffice />;
      case 'teams':
        return <UsersThree />;
      case 'contacts':
        return <AddressBook />;
      case 'email':
        return <At />;
      default:
        return null;
    }
  };

  const text = () => {
    switch (type) {
      case 'orgMemberProfile':
        return 'Org Member';
      case 'org':
        return 'Organization';
      case 'teams':
        return 'Team';
      case 'contacts':
        return 'Contact';
      case 'email':
        return 'New Contact';
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'flex flex-row items-center gap-1 truncate',
        avatarIconVariants({ size: iconProps.size })
      )}>
      {iconProps.withDot && <Dot />}
      <AvatarTypeIcon />
      <span>{text()}</span>
      {/* Don't show the address in email as its already in name */}
      {iconProps.withDot && type !== 'email' && <Dot />}
      {iconProps.address && type !== 'email' && (
        <span className="text-base-11 font-normal">{iconProps.address}</span>
      )}
    </div>
  );
}
