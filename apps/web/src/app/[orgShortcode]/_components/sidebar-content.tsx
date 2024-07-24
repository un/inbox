'use client';

import useLoading from '@/src/hooks/use-loading';
import { cn, generateAvatarUrl, getInitials } from '@/src/lib/utils';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/src/components/shadcn-ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuGroup
} from '@/src/components/shadcn-ui/dropdown-menu';
import {
  Check,
  SignOut,
  MoonStars,
  Gear,
  Sun,
  Book,
  QuestionMark,
  MapPin,
  Activity,
  Megaphone,
  CaretUpDown,
  Plus,
  Palette,
  Monitor,
  Question,
  User
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { useTheme } from 'next-themes';
import { sidebarSubmenuOpenAtom } from './atoms';
import { useAtom } from 'jotai';
import {
  ToggleGroup,
  ToggleGroupItem
} from '@/src/components/shadcn-ui/toggle-group';
import { env } from '@/src/env';

export default function SidebarContent() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  return (
    <div
      className={cn(
        'bg-base-3 border-base-5 z-[1] flex h-full w-full min-w-56 resize-x flex-col items-start gap-4 rounded-2xl border p-2'
      )}>
      <OrgMenu />
      <div
        className={cn(
          'flex w-full grow flex-col items-start justify-start gap-4 p-0'
        )}>
        <div className="flex w-full flex-col gap-0 p-0">
          <span className="text-base-10 p-1 text-[10px] font-semibold uppercase">
            Spaces
          </span>
          <Link
            className="hover:bg-base-1 flex w-full max-w-full flex-row items-center gap-2 truncate rounded-lg p-1.5"
            href={`/${orgShortcode}/convo`}>
            <div className="bg-blue-4 text-blue-9 flex h-6 w-6 items-center justify-center rounded-sm">
              <User
                weight="bold"
                className={'h-4 w-4'}
              />
            </div>
            <span className="text-base-12 font-medium">My personal space</span>
          </Link>
        </div>
      </div>
      <div className="flex w-full flex-row items-center justify-between p-1">
        <span className={cn('font-display text-base-11 text-sm')}>UnInbox</span>
        <span className={cn('text-base-11 text-xs')}>v0.1.0</span>
      </div>
    </div>
  );
}

function OrgMenu() {
  const setCurrentOrg = useGlobalStore((state) => state.setCurrentOrg);
  const currentOrg = useGlobalStore((state) => state.currentOrg);
  const username = useGlobalStore((state) => state.user.username);
  const orgs = useGlobalStore((state) => state.orgs);
  const queryClient = useQueryClient();
  const [, setSidebarSubmenuOpen] = useAtom(sidebarSubmenuOpenAtom);

  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const orgAvatarUrl = useMemo(
    () =>
      generateAvatarUrl({
        publicId: currentOrg.publicId,
        avatarTimestamp: currentOrg.avatarTimestamp,
        size: '5xl'
      }),
    [currentOrg.publicId, currentOrg.avatarTimestamp]
  );

  const userAvatarUrl = useMemo(
    () =>
      generateAvatarUrl({
        publicId: currentOrg.orgMemberProfile.publicId,
        avatarTimestamp: currentOrg.orgMemberProfile.avatarTimestamp,
        size: '5xl'
      }),
    [
      currentOrg.orgMemberProfile.publicId,
      currentOrg.orgMemberProfile.avatarTimestamp
    ]
  );

  const { run: logOut, loading: loggingOut } = useLoading(
    async () => {
      await fetch(`${env.NEXT_PUBLIC_PLATFORM_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      queryClient.removeQueries();
      router.replace('/');
    },
    {
      onError: (error) => {
        if (error) toast.error(error.message);
      }
    }
  );

  const displayName =
    `${currentOrg.orgMemberProfile.firstName ?? username} ${currentOrg.orgMemberProfile.lastName}`.trim();

  return (
    <div className={'w-full'}>
      <DropdownMenu onOpenChange={(open) => setSidebarSubmenuOpen(open)}>
        <DropdownMenuTrigger
          className={
            'bg-base-1 border-base-5 hover:bg-base-2 flex w-full flex-row items-center justify-between gap-2 rounded-lg border p-3 shadow-sm'
          }>
          <div className={'flex flex-row items-center gap-2'}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={orgAvatarUrl ?? undefined} />
              <AvatarFallback className={'text-sm font-semibold'}>
                {getInitials(currentOrg.name)}
              </AvatarFallback>
            </Avatar>
            <div className={'flex flex-col items-start justify-start'}>
              <span className={cn('text-sm font-semibold leading-none')}>
                {currentOrg.name}
              </span>
              <span
                className={cn('text-base-11 text-xs font-medium leading-none')}>
                {displayName}
              </span>
            </div>
          </div>

          <div className={'h-5 w-5 p-0.5'}>
            <CaretUpDown className={'h-4 w-4'} />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-base-1 border-base-5 flex w-[214px] flex-col gap-0 p-0">
          <DropdownMenuLabel className={'px-0 py-0'}>
            <div className="flex flex-col items-start justify-start gap-2 p-3">
              <span className={'text-base-11 text-xs font-medium uppercase'}>
                Signed in as
              </span>
              <div className={'flex flex-row gap-2'}>
                <Avatar>
                  <AvatarImage src={userAvatarUrl ?? undefined} />
                  <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start justify-center">
                  <span
                    className={'text-base-12 text-sm font-medium leading-none'}>
                    {displayName}
                  </span>
                  <span
                    className={'text-base-11 text-xs font-normal leading-none'}>
                    @{username}
                  </span>
                </div>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup
            className={'flex flex-col items-start justify-start gap-2 p-3'}>
            <DropdownMenuLabel className={'px-0 py-0'}>
              <span
                className={
                  'text-base-11 w-full text-left text-xs font-medium uppercase'
                }>
                Organizations
              </span>
            </DropdownMenuLabel>
            {orgs.map((org) => (
              <DropdownMenuItem
                key={org.publicId}
                className="focus:bg-base-3 rounded-sm p-0"
                asChild>
                <div
                  onClick={() => {
                    setCurrentOrg(org.shortcode);
                    router.push(`/${org.shortcode}/convo`);
                  }}
                  className={
                    'flex w-full cursor-pointer flex-row items-center justify-between gap-2'
                  }>
                  <div className="flex flex-row items-center gap-2">
                    <Avatar>
                      <AvatarImage
                        src={
                          generateAvatarUrl({
                            publicId: org.publicId,
                            avatarTimestamp: org.avatarTimestamp,
                            size: '5xl'
                          }) ?? undefined
                        }
                      />
                      <AvatarFallback>{getInitials(org.name)}</AvatarFallback>
                    </Avatar>
                    <span className={'text-base-12 text-sm font-medium'}>
                      {org.name}
                    </span>
                  </div>
                  {org.shortcode === currentOrg.shortcode && <Check />}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              key={'addNewOrg'}
              className="focus:bg-base-3 rounded-sm p-0"
              asChild>
              <div
                onClick={() => {
                  router.push(`/join/org`);
                }}
                className={
                  'flex w-full cursor-pointer flex-row items-center justify-between gap-2'
                }>
                <div className="flex flex-row items-center gap-2">
                  <div
                    className={
                      'border-base-5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-dotted'
                    }>
                    <Plus
                      weight="bold"
                      className={'absolute h-4 w-4'}
                    />
                  </div>
                  <span className={'text-base-11 text-sm font-medium'}>
                    Create Organization
                  </span>
                </div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup className={'p-2'}>
            <DropdownMenuItem asChild>
              <Link
                href={`/${currentOrg.shortcode}/settings`}
                className="text-base-11 flex w-full flex-row items-center gap-2 font-medium">
                <Gear className={'h-4 w-4'} />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
              }}>
              <div
                className={
                  'text-base-11 flex w-full flex-row items-center justify-between'
                }>
                <div
                  className={
                    'text-base-11 flex flex-row items-center gap-2 font-medium'
                  }>
                  <Palette className={'h-4 w-4'} />
                  <span>Theme</span>
                </div>

                <ToggleGroup
                  type="single"
                  size="xs"
                  className="gap-0"
                  value={theme}
                  onValueChange={(value: string) => {
                    setTheme(value);
                  }}>
                  <ToggleGroupItem
                    value="light"
                    aria-label="Toggle light mode"
                    className={
                      theme === 'light' ? 'border-base-7 rounded-md border' : ''
                    }>
                    <Sun className={'h-4 w-4'} />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="dark"
                    aria-label="Toggle dark mode"
                    className={
                      theme === 'dark' ? 'border-base-7 rounded-md border' : ''
                    }>
                    <MoonStars className={'h-4 w-4'} />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="system"
                    aria-label="Toggle system default"
                    className={
                      theme === 'system'
                        ? 'border-base-7 rounded-md border'
                        : ''
                    }>
                    <Monitor className={'h-4 w-4'} />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <div className="text-base-11 flex w-full flex-row items-center gap-2 font-medium">
                  <Question className={'h-4 w-4'} />
                  <span>Help</span>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>
                    <div
                      className={
                        'text-base-11 flex w-full flex-row items-center gap-2 font-medium'
                      }>
                      <Book className={'h-4 w-4'} />
                      <span>Documentation</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <div
                      className={
                        'text-base-11 flex w-full flex-row items-center gap-2 font-medium'
                      }>
                      <QuestionMark />
                      <span>Support</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <div
                      className={
                        'text-base-11 flex w-full flex-row items-center gap-2 font-medium'
                      }>
                      <MapPin className={'h-4 w-4'} />
                      <span>Roadmap</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <div
                      className={
                        'text-base-11 flex w-full flex-row items-center gap-2 font-medium'
                      }>
                      <Activity className={'h-4 w-4'} />
                      <span>Status</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <div
                      className={
                        'text-base-11 flex w-full flex-row items-center gap-2 font-medium'
                      }>
                      <Megaphone className={'h-4 w-4'} />
                      <span>Changelog</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="" />
          <DropdownMenuItem
            onMouseDown={() => {
              setSidebarSubmenuOpen(false);
              logOut();
            }}
            disabled={loggingOut}
            className="focus:bg-red-9 focus:text-base-1 text-base-11">
            <div className={'flex flex-row items-center gap-2 p-2 font-medium'}>
              <SignOut className={'h-4 w-4'} />
              <span>Log out</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
