'use client';

import useLoading from '@/src/hooks/use-loading';
import { cn, generateAvatarUrl, getInitials } from '@/src/lib/utils';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { Button } from '@/src/components/shadcn-ui/button';
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
  AddressBook,
  SignOut,
  ChatCircle,
  MoonStars,
  Gear,
  SpinnerGap,
  Sun,
  CaretRight,
  CaretLeft,
  SquaresFour,
  Shield,
  CaretUp,
  Book,
  QuestionMark,
  MapPin,
  Activity,
  Megaphone
} from '@phosphor-icons/react';
import { env } from 'next-runtime-env';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { SidebarNavButton } from './sidebar-nav-button';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);

  return (
    <div
      className={cn(
        'bg-sand-3 flex h-full w-full resize-x flex-col items-start gap-4 p-2',
        collapsed ? 'min-w-10' : 'min-w-72 max-w-72'
      )}>
      <div className="flex w-full flex-row items-center justify-between p-2">
        <span
          className={cn(
            'font-display w-full select-none text-2xl',
            collapsed ? 'mt-4 text-center' : ''
          )}>
          {collapsed ? 'Un' : 'UnInbox'}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            setCollapsed(!collapsed);
          }}>
          {collapsed ? (
            <CaretRight className="h-4 w-4" />
          ) : (
            <CaretLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div
        className={cn(
          'flex w-full grow flex-col items-start justify-start gap-4 p-0'
          // !collapsed && 'p-2'
        )}>
        <SidebarNavButton
          link="/"
          icon={<SquaresFour weight="duotone" />}
          isActive={false}
          isExpanded={true}
          label="My Personal Space"
          sidebarCollapsed={collapsed}>
          <SidebarNavButton
            link={`/${orgShortCode}/convo`}
            icon={<ChatCircle weight="duotone" />}
            isActive={false}
            label="Conversations"
            sidebarCollapsed={collapsed}></SidebarNavButton>

          <SidebarNavButton
            link="/contact"
            icon={<AddressBook weight="duotone" />}
            isActive={false}
            label="Contacts"
            disabled
            badge="Soon"
            sidebarCollapsed={collapsed}
          />
          <SidebarNavButton
            link="/contact"
            icon={<Shield weight="duotone" />}
            isActive={false}
            label="Screener"
            disabled
            badge="Soon"
            sidebarCollapsed={collapsed}
          />
        </SidebarNavButton>
      </div>
      <OrgMenu collapsed={collapsed} />
    </div>
  );
}

const PLATFORM_URL = env('NEXT_PUBLIC_PLATFORM_URL');

function OrgMenu({ collapsed }: { collapsed: boolean }) {
  const setCurrentOrg = useGlobalStore((state) => state.setCurrentOrg);
  const currentOrg = useGlobalStore((state) => state.currentOrg);
  const username = useGlobalStore((state) => state.user.username);
  const orgs = useGlobalStore((state) => state.orgs);
  const queryClient = useQueryClient();

  const { setTheme, resolvedTheme } = useTheme();
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
      await fetch(`${PLATFORM_URL}/auth/logout`, {
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
      <DropdownMenu>
        <DropdownMenuTrigger
          className={'hover:bg-sand-4 w-full rounded-md p-2'}>
          <div className=" flex w-full flex-row items-center justify-between">
            <div className="flex flex-row items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={orgAvatarUrl ?? undefined} />
                <AvatarFallback className={'text-sm font-semibold'}>
                  {getInitials(currentOrg.name)}
                </AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  'text-semibold text-sm',
                  collapsed ? 'hidden' : ''
                )}>
                {currentOrg.name}
              </span>
            </div>
            <div className={'h-5 w-5 p-0.5'}>
              <CaretUp weight="duotone" />
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-fit p-2">
          <DropdownMenuLabel className="">
            <div className="flex flex-col gap-2">
              <span className={'text-sand-11 text-xs uppercase'}>
                Signed in as
              </span>
              <div className={'flex flex-row gap-2'}>
                <Avatar>
                  <AvatarImage src={userAvatarUrl ?? undefined} />
                  <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className={'text-sand-12 text-sm font-medium'}>
                    {displayName}
                  </span>
                  <span className={'text-sand-11 text-xs font-normal'}>
                    @{username}
                  </span>
                </div>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className={'flex flex-col gap-4 py-2'}>
            {orgs.map((org) => (
              <DropdownMenuItem
                key={org.publicId}
                className="p-2"
                asChild>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCurrentOrg(org.shortCode);
                    router.push(`/${org.shortCode}/convo`);
                  }}
                  className="flex w-full flex-row items-center justify-between gap-2">
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
                    <span className={'text-sand-12 text-sm font-medium'}>
                      {org.name}
                    </span>
                  </div>
                  {org.shortCode === currentOrg.shortCode && <Check />}
                </Button>
              </DropdownMenuItem>
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuGroup className={'p-0'}>
            <DropdownMenuItem>
              <Link
                href={`/${currentOrg.shortCode}/settings`}
                className="flex w-full flex-row items-center justify-between">
                <span>Settings</span>
                <Gear weight="duotone" />
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
              }}>
              <div
                className={
                  'flex w-full flex-row items-center justify-between gap-2'
                }>
                <span>
                  {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </span>
                {resolvedTheme === 'dark' ? (
                  <Sun weight="duotone" />
                ) : (
                  <MoonStars weight="duotone" />
                )}
              </div>
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Help</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>
                    <div
                      className={
                        'flex w-full flex-row items-center justify-between gap-8'
                      }>
                      <span>Documentation</span>
                      <Book weight="duotone" />
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <div
                      className={
                        'flex w-full flex-row items-center justify-between gap-2'
                      }>
                      <span>Support</span>
                      <QuestionMark />
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <div
                      className={
                        'flex w-full flex-row items-center justify-between gap-2'
                      }>
                      <span>Roadmap</span>
                      <MapPin weight="duotone" />
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <div
                      className={
                        'flex w-full flex-row items-center justify-between gap-2'
                      }>
                      <span>Status</span>
                      <Activity weight="duotone" />
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <div
                      className={
                        'flex w-full flex-row items-center justify-between gap-2'
                      }>
                      <span>Changelog</span>
                      <Megaphone weight="duotone" />
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Button
              variant="destructive"
              onClick={() => logOut()}
              disabled={loggingOut}
              className="mt-2 w-full">
              <span>Logout</span>
              {loggingOut ? (
                <SpinnerGap className=" animate-spin" />
              ) : (
                <SignOut />
              )}
            </Button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
