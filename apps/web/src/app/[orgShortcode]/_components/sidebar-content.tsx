'use client';

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
  SpinnerGap,
  SquaresFour,
  DotsThree
} from '@phosphor-icons/react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/src/components/shadcn-ui/tooltip';
import {
  ToggleGroup,
  ToggleGroupItem
} from '@/src/components/shadcn-ui/toggle-group';
import { useOrgScopedRouter, useOrgShortcode } from '@/src/hooks/use-params';
import { type InferQueryLikeData } from '@trpc/react-query/shared';
import { Separator } from '@/src/components/shadcn-ui/separator';
import { Button } from '@/src/components/shadcn-ui/button';
import { logoutCleanup, platform } from '@/src/lib/trpc';
import { useIsMobile } from '@/src/hooks/use-is-mobile';
import { useMutation } from '@tanstack/react-query';
import { NewSpaceModal } from './new-space-modal';
import { Avatar } from '@/src/components/avatar';
import { sidebarSubmenuOpenAtom } from './atoms';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/src/lib/utils';
import { ms } from '@u22n/utils/ms';
import { useSetAtom } from 'jotai';
import { env } from '@/src/env';
import { useMemo } from 'react';
import Link from 'next/link';

export function SidebarContent() {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        'bg-base-3 border-base-5 z-[1] flex h-full w-full min-w-56 resize-x flex-col items-start gap-4 rounded-2xl border p-2',
        isMobile && 'bg-base-2 p-8 pb-10'
      )}>
      {!isMobile && <OrgMenu />}
      <SpacesNav />
      <NavAppVersion />
    </div>
  );
}

type SingleSpaceResponse = InferQueryLikeData<
  typeof platform.spaces.getOrgMemberSpaces
>['spaces'][number];

function SpaceItem({
  space: spaceData,
  isPersonal
}: {
  space: SingleSpaceResponse;
  isPersonal: boolean;
}) {
  const { scopedUrl } = useOrgScopedRouter();
  const router = useRouter();
  const orgShortCode = useOrgShortcode();

  const SpaceIcon = () => {
    return (
      <SquaresFour
        className="h-4 w-4"
        weight="bold"
      />
    );
  };

  return (
    <div className="hover:bg-slate-1 group flex w-full max-w-full flex-row items-center gap-2 truncate rounded-lg p-0.5">
      <Link
        className="flex w-full max-w-full flex-row items-center gap-4 truncate p-1"
        href={
          isPersonal
            ? scopedUrl('/personal/convo')
            : scopedUrl(`/${spaceData.shortcode}/convo`)
        }>
        <div
          className="flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded-sm"
          style={{
            backgroundColor: `var(--${spaceData.color}4)`,
            color: `var(--${spaceData.color}9)`
          }}>
          <SpaceIcon />
        </div>
        <span className="text-slate-12 h-full truncate font-medium">
          {isPersonal ? 'My Personal Space' : spaceData.name || 'Unnamed Space'}
        </span>
      </Link>
      <div className="w-0 overflow-hidden transition-all group-hover:w-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost">
              <DotsThree />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {/* TODO: Add in with the notifications
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Notifications</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup>
                    <DropdownMenuRadioItem value="top">
                      Top
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="bottom">
                      Bottom
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="right">
                      Right
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub> 
            <DropdownMenuSeparator />
            */}
            <DropdownMenuItem
              onSelect={() => {
                router.push(`/${orgShortCode}/${spaceData.shortcode}/settings`);
              }}>
              Space Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function OrgMenu() {
  const setSidebarSubmenuOpen = useSetAtom(sidebarSubmenuOpenAtom);
  const orgShortcode = useOrgShortcode();

  const { data: orgData, isLoading } =
    platform.org.crud.getAccountOrgs.useQuery({}, { staleTime: ms('1 hour') });
  const { data: memberProfile } =
    platform.account.profile.getOrgMemberProfile.useQuery(
      {
        orgShortcode
      },
      {
        staleTime: ms('1 hour')
      }
    );

  const currentOrg = useMemo(
    () =>
      orgData?.userOrgs.find((org) => org.org.shortcode === orgShortcode)
        ?.org ?? null,
    [orgData?.userOrgs, orgShortcode]
  );

  const displayName = memberProfile?.profile
    ? `${memberProfile.profile.firstName ?? memberProfile.account?.username ?? ''} ${memberProfile.profile.lastName}`.trim()
    : '...';

  return (
    <div className={'w-full'}>
      <DropdownMenu onOpenChange={(open) => setSidebarSubmenuOpen(open)}>
        <DropdownMenuTrigger
          className={
            'bg-base-1 border-base-5 hover:bg-base-2 flex w-full flex-row items-center justify-between gap-2 rounded-lg border p-3 shadow-sm'
          }>
          <div className={'flex w-full flex-row items-center gap-2'}>
            <div>
              {isLoading || !currentOrg ? (
                <div className="flex size-8 items-center justify-center rounded-full border">
                  <SpinnerGap
                    className="size-6 animate-spin"
                    size={24}
                  />
                </div>
              ) : (
                <Avatar
                  avatarProfilePublicId={currentOrg.publicId}
                  avatarTimestamp={currentOrg.avatarTimestamp}
                  name={currentOrg.name}
                  size="lg"
                  hideTooltip
                />
              )}
            </div>
            <div
              className={
                'flex w-full flex-col items-start justify-start gap-1 overflow-hidden'
              }>
              <span
                className={cn(
                  'block w-full truncate text-left text-sm font-semibold leading-none'
                )}>
                {currentOrg?.name ?? '...'}
              </span>
              <span
                className={cn(
                  'text-base-11 block w-full truncate text-left text-xs font-medium leading-none'
                )}>
                {displayName}
              </span>
            </div>
            <div className={'h-5 w-5 p-0.5 pl-1'}>
              <CaretUpDown className={'h-4 w-4'} />
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-base-1 border-base-5 flex w-fit max-w-[250px] flex-col gap-0 p-0">
          <OrgMenuContent />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function OrgMenuContent() {
  const orgShortcode = useOrgShortcode();
  const { scopedUrl } = useOrgScopedRouter();

  const { data: orgData, isLoading } =
    platform.org.crud.getAccountOrgs.useQuery({}, { staleTime: ms('1 hour') });
  const { data: memberProfile } =
    platform.account.profile.getOrgMemberProfile.useQuery(
      {
        orgShortcode
      },
      {
        staleTime: ms('1 hour')
      }
    );

  const currentOrg = useMemo(
    () =>
      orgData?.userOrgs.find((org) => org.org.shortcode === orgShortcode)
        ?.org ?? null,
    [orgData?.userOrgs, orgShortcode]
  );

  const setSidebarSubmenuOpen = useSetAtom(sidebarSubmenuOpenAtom);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const isMobile = useIsMobile();

  const { mutate: logOut, isPending: loggingOut } = useMutation({
    mutationFn: async () => {
      await fetch(`${env.NEXT_PUBLIC_PLATFORM_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      logoutCleanup();
    }
  });

  const displayName = memberProfile?.profile
    ? `${memberProfile.profile.firstName ?? memberProfile.account?.username ?? ''} ${memberProfile.profile.lastName}`.trim()
    : '...';

  return (
    <>
      <DropdownMenuLabel className={'px-0 py-0'}>
        <div className="flex w-full flex-col items-start justify-start gap-2 p-3">
          <span className={'text-base-11 text-xs font-medium uppercase'}>
            Signed in as
          </span>
          <div className={'flex w-full flex-row gap-2'}>
            {isLoading || !currentOrg ? (
              <div className="flex size-8 items-center justify-center rounded-full border">
                <SpinnerGap
                  className="size-6 animate-spin"
                  size={24}
                />
              </div>
            ) : (
              <div>
                <Avatar
                  avatarProfilePublicId={currentOrg.publicId}
                  avatarTimestamp={currentOrg.avatarTimestamp}
                  name={currentOrg.name}
                  size="lg"
                  hideTooltip
                />
              </div>
            )}
            <div className="flex w-full flex-col items-start justify-center gap-2 overflow-hidden">
              <span
                className={
                  'text-base-12 block w-full truncate text-sm font-medium leading-none'
                }>
                {displayName}
              </span>
              <span className={'text-base-11 text-xs font-normal leading-none'}>
                @{memberProfile?.account?.username ?? '...'}
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
        {orgData?.userOrgs.map(({ org }) => (
          <DropdownMenuItem
            key={org.publicId}
            className="focus:bg-base-3 rounded-sm p-0"
            asChild>
            <div
              onClick={() => {
                router.push(`/${org.shortcode}/personal/convo`);
              }}
              className={
                'flex w-full cursor-pointer flex-row items-center justify-between gap-2'
              }>
              <div className="flex flex-row items-center gap-2">
                <Avatar
                  avatarProfilePublicId={org.publicId}
                  avatarTimestamp={org.avatarTimestamp}
                  name={org.name}
                  size="lg"
                  hideTooltip
                />
                <span className={'text-base-12 text-sm font-medium'}>
                  {org.name}
                </span>
              </div>
              {org.shortcode === currentOrg?.shortcode && <Check />}
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
                  'border-base-5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-dotted'
                }>
                <Plus
                  weight="regular"
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
            href={scopedUrl('/settings')}
            className="text-base-11 flex w-full flex-row items-center gap-2 font-medium">
            <Gear className={'h-4 w-4'} />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
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
              onValueChange={(value) => setTheme(value)}>
              <ToggleGroupItem
                value="light"
                aria-label="Toggle light mode"
                className={cn(
                  theme === 'light' && 'border-base-7 rounded-md border'
                )}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Sun className={'h-4 w-4'} />
                  </TooltipTrigger>
                  <TooltipContent>Light mode</TooltipContent>
                </Tooltip>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="dark"
                aria-label="Toggle dark mode"
                className={cn(
                  theme === 'dark' && 'border-base-7 rounded-md border'
                )}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MoonStars className={'h-4 w-4'} />
                  </TooltipTrigger>
                  <TooltipContent>Dark mode</TooltipContent>
                </Tooltip>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="system"
                aria-label="Follow system default"
                className={cn(
                  theme === 'system' && 'border-base-7 rounded-md border'
                )}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Monitor className={'h-4 w-4'} />
                  </TooltipTrigger>
                  <TooltipContent>Follow System</TooltipContent>
                </Tooltip>
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
            <DropdownMenuSubContent
              className={cn(isMobile && 'mb-[200px]')}
              sideOffset={isMobile ? -150 : 0}>
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
                <Link
                  href={scopedUrl(
                    `/convo/new?emails=support@uninbox.com&subject=Need%20help%20getting%20unblocked`
                  )}
                  target="_blank">
                  <div
                    className={
                      'text-base-11 flex w-full flex-row items-center gap-2 font-medium'
                    }>
                    <QuestionMark />

                    <span>Support</span>
                  </div>
                </Link>
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
      <DropdownMenuSeparator />
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
    </>
  );
}

export function SpacesNav() {
  const { scopedUrl } = useOrgScopedRouter();
  const orgShortcode = useOrgShortcode();

  const { data: unsortedSpaceData } =
    platform.spaces.getOrgMemberSpaces.useQuery({
      orgShortcode
    });

  // sort the spaceData to have the personal space at the top
  const spaceData = unsortedSpaceData?.spaces.sort((a, b) => {
    if (a.publicId === unsortedSpaceData.personalSpaceId) {
      return -1;
    }
    if (b.publicId === unsortedSpaceData.personalSpaceId) {
      return 1;
    }
    return 0;
  });

  return (
    <div
      className={cn(
        'flex w-full grow flex-col items-start justify-start gap-4 overflow-y-auto overflow-x-hidden p-0'
      )}>
      <div className="flex w-full flex-col gap-0 p-0">
        <span className="text-slate-10 p-1 text-xs font-semibold uppercase">
          Spaces
        </span>

        {spaceData && spaceData?.length > 1 && (
          <div className="hover:bg-slate-1 group flex w-full max-w-full flex-row items-center gap-2 truncate rounded-lg p-0.5">
            <Link
              className="flex w-full max-w-full flex-row items-center gap-4 truncate p-1"
              href={scopedUrl('/all/convo')}>
              <div className="bg-accent-4 text-accent-9 flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded-sm">
                <SquaresFour
                  className="h-4 w-4"
                  weight="bold"
                />
              </div>
              <span className="text-slate-12 h-full truncate font-medium">
                All Conversations
              </span>
            </Link>
          </div>
        )}

        {spaceData
          ?.filter(
            (space) => space.publicId === unsortedSpaceData?.personalSpaceId
          )
          .map((space) => (
            <SpaceItem
              space={space}
              key={space.publicId}
              isPersonal={true}
            />
          ))}
        <Separator className="my-4" />

        <div className="flex w-full flex-col gap-0 p-0">
          <span className="text-slate-10 p-1 text-[10px] font-semibold uppercase">
            Shared Spaces
          </span>

          {spaceData
            ?.filter(
              (space) => space.publicId !== unsortedSpaceData?.personalSpaceId
            )
            .map((space) => (
              <SpaceItem
                space={space}
                key={space.publicId}
                isPersonal={false}
              />
            ))}
        </div>

        <NewSpaceModal />
      </div>
    </div>
  );
}

export function NavAppVersion() {
  return (
    <div className="flex w-full flex-row items-center justify-between p-1">
      <span className={cn('font-display text-base-11 text-sm')}>UnInbox</span>
      <span className={cn('text-base-11 text-xs')}>
        v{env.NEXT_PUBLIC_APP_VERSION}
      </span>
    </div>
  );
}
