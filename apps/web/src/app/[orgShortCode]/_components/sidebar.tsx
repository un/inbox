'use client';

import useLoading from '@/src/hooks/use-loading';
import { cn, generateAvatarUrl, getInitials } from '@/src/lib/utils';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import {
  Button,
  Flex,
  Heading,
  Text,
  Badge,
  DropdownMenu,
  IconButton,
  Avatar,
  Separator
} from '@radix-ui/themes';
import {
  Asterisk,
  Check,
  Contact,
  HelpCircle,
  LogOut,
  MessageCircle,
  MessagesSquare,
  MoonStar,
  Newspaper,
  Settings,
  ShieldAlert,
  Sun
} from 'lucide-react';
import { env } from 'next-runtime-env';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function Sidebar() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const [collapsed, setCollapsed] = useState(true);

  return (
    <Flex
      className={cn(
        'bg-slate-3 dark:bg-slatedark-3 h-full w-full',
        collapsed ? 'min-w-10 px-2 py-4' : 'min-w-60 p-4'
      )}
      direction="column"
      gap="4">
      <Button
        variant="surface"
        onClick={() => {
          setCollapsed(!collapsed);
        }}>
        {collapsed ? '>>' : '<<'}
      </Button>
      <Heading
        as="h1"
        size={collapsed ? '6' : '4'}
        className={cn(
          'font-display w-full select-none font-semibold',
          collapsed ? 'mt-4 text-center' : ''
        )}>
        {collapsed ? 'Un' : 'UnInbox'}
      </Heading>
      <Flex
        className={cn(!collapsed && 'p-2', 'w-full flex-1')}
        align="center"
        justify="start"
        direction="column"
        gap="3">
        <Button
          variant="soft"
          radius="full"
          className={cn('flex w-full', collapsed ? 'max-w-16' : 'p-3')}
          asChild>
          <Link
            href={`/${orgShortCode}/convo`}
            className={cn(
              'flex w-full flex-row items-center justify-center gap-2',
              { 'aspect-square': collapsed }
            )}>
            <MessageCircle
              size={collapsed ? 20 : 16}
              className="aspect-square"
            />
            <Text
              size="2"
              weight="bold"
              className={cn(collapsed ? 'hidden' : '')}>
              Conversations
            </Text>
          </Link>
        </Button>
        <Button
          variant="soft"
          radius="full"
          className={cn(
            'flex w-full flex-row items-center justify-center gap-2',
            collapsed ? 'aspect-square max-w-16' : 'p-3'
          )}
          disabled>
          <Contact
            size={collapsed ? 20 : 16}
            className="aspect-square"
          />
          <Text
            size="2"
            weight="bold"
            className={cn(collapsed ? 'hidden' : 'flex gap-2')}>
            Contacts
            <Badge>Soon</Badge>
          </Text>
        </Button>
        <Button
          variant="soft"
          radius="full"
          className={cn(
            'flex w-full flex-row items-center justify-center gap-2',
            collapsed ? 'aspect-square max-w-16' : 'p-3'
          )}
          disabled>
          <MessagesSquare
            size={collapsed ? 20 : 16}
            className="aspect-square"
          />
          <Text
            size="2"
            weight="bold"
            className={cn(collapsed ? 'hidden' : 'flex gap-2')}>
            Group Convos
            <Badge>Soon</Badge>
          </Text>
        </Button>
        <Button
          variant="soft"
          radius="full"
          className={cn(
            'flex w-full flex-row items-center justify-center gap-2',
            collapsed ? 'aspect-square max-w-16' : 'p-3'
          )}
          disabled>
          <ShieldAlert
            size={collapsed ? 20 : 16}
            className="aspect-square"
          />
          <Text
            size="2"
            weight="bold"
            className={cn(collapsed ? 'hidden' : 'flex gap-2')}>
            Screener
            <Badge>Soon</Badge>
          </Text>
        </Button>
        <Button
          variant="soft"
          radius="full"
          className={cn(
            'flex w-full flex-row items-center justify-center gap-2',
            collapsed ? 'aspect-square max-w-16' : 'p-3'
          )}
          disabled>
          <Newspaper
            size={collapsed ? 20 : 16}
            className="aspect-square"
          />
          <Text
            size="2"
            weight="bold"
            className={cn(collapsed ? 'hidden' : 'flex gap-2')}>
            Feed
            <Badge>Soon</Badge>
          </Text>
        </Button>
        <Button
          variant="soft"
          radius="full"
          className={cn(
            'flex w-full flex-row items-center justify-center gap-2',
            collapsed ? 'aspect-square max-w-16' : 'p-3'
          )}
          disabled>
          <Asterisk
            size={collapsed ? 20 : 16}
            className="aspect-square"
          />
          <Text
            size="2"
            weight="bold"
            className={cn(collapsed ? 'hidden' : 'flex gap-2')}>
            Codes
            <Badge>Soon</Badge>
          </Text>
        </Button>
      </Flex>
      <Separator size="4" />
      <OrgMenu collapsed={collapsed} />
    </Flex>
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
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Flex
          className="mx-auto"
          align="center"
          justify="center"
          gap="4">
          <IconButton
            className="mx-auto my-2"
            radius="full"
            variant="soft">
            <Avatar
              src={orgAvatarUrl ?? undefined}
              fallback={getInitials(currentOrg.name)}
              radius="full"
            />
          </IconButton>
          <Text
            className={cn(collapsed ? 'hidden' : '')}
            size="2"
            weight="bold">
            {currentOrg.name}
          </Text>
        </Flex>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        size="2"
        variant="soft"
        className="w-fit">
        <DropdownMenu.Label className="h-max">
          <Flex
            direction="column"
            justify="center"
            gap="2">
            <Text size="1">Signed in as</Text>
            <Flex
              gap="2"
              align="center">
              <Avatar
                src={userAvatarUrl ?? undefined}
                fallback={getInitials(displayName)}
                radius="full"
              />
              <Flex direction="column">
                <Text
                  size="1"
                  weight="bold">
                  {displayName}
                </Text>
                <Text size="1">{username}</Text>
              </Flex>
            </Flex>
          </Flex>
        </DropdownMenu.Label>
        <DropdownMenu.Separator />
        {orgs.map((org) => (
          <DropdownMenu.Item
            key={org.publicId}
            className="mx-0 my-1 h-max"
            asChild>
            <Button
              variant="ghost"
              onClick={() => {
                setCurrentOrg(org.shortCode);
                router.push(`/${org.shortCode}/convo`);
              }}
              className="flex items-center justify-start gap-2">
              <Avatar
                src={
                  generateAvatarUrl({
                    publicId: org.publicId,
                    avatarTimestamp: org.avatarTimestamp,
                    size: '5xl'
                  }) ?? undefined
                }
                fallback={getInitials(org.name)}
                radius="full"
              />
              <Text
                size="2"
                weight="bold">
                {org.name}
              </Text>

              <Badge
                className={cn(
                  org.shortCode === currentOrg.shortCode ? '' : 'opacity-0'
                )}>
                <Check size={12} />
              </Badge>
            </Button>
          </DropdownMenu.Item>
        ))}
        <DropdownMenu.Separator />
        <DropdownMenu.Item>
          <Link
            href={`/${currentOrg.shortCode}/settings`}
            className="flex w-full items-center justify-between">
            <Text>Settings</Text>
            <Settings size={16} />
          </Link>
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onClick={() => {
            setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
          }}>
          <Flex
            align="center"
            justify="between"
            className="w-full">
            <Text>Toggle Theme</Text>
            {resolvedTheme === 'dark' ? (
              <MoonStar size={16} />
            ) : (
              <Sun size={16} />
            )}
          </Flex>
        </DropdownMenu.Item>
        <DropdownMenu.Item>
          <Flex
            align="center"
            justify="between"
            className="w-full">
            <Text>Help</Text>
            <HelpCircle size={16} />
          </Flex>
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item asChild>
          <Button
            variant="outline"
            onClick={() => logOut()}
            loading={loggingOut}
            className="w-full">
            <Text>Logout</Text>
            <LogOut size={16} />
          </Button>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
