'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Flex, Text, Container } from '@radix-ui/themes';
import Link from 'next/link';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import {
  User,
  Envelope,
  Lock,
  Buildings,
  CreditCard,
  At,
  Globe,
  Users,
  UserPlus,
  HandHeart
} from '@phosphor-icons/react';

type NavLinks = {
  label: string;
  to: string;
  icon: ReactNode;
};

export default function SettingsSidebar() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const pathname = usePathname();

  const { data: isAdmin } = api.org.users.members.isOrgMemberAdmin.useQuery({
    orgShortCode
  });

  const personalLinks: NavLinks[] = [
    {
      label: 'Profile',
      to: `/${orgShortCode}/settings/user/profile`,
      icon: <User />
    },
    {
      label: 'Personal Addresses',
      to: `/${orgShortCode}/settings/user/addresses`,
      icon: <Envelope />
    },
    {
      label: 'Security',
      to: `/${orgShortCode}/settings/user/security`,
      icon: <Lock />
    }
  ];
  const orgSetupLinks: NavLinks[] = [
    {
      label: 'Org Profile',
      to: `/${orgShortCode}/settings/org`,
      icon: <Buildings />
    },
    {
      label: 'Billing',
      to: `/${orgShortCode}/settings/org/setup/billing`,
      icon: <CreditCard />
    }
  ];

  const orgUserLinks: NavLinks[] = [
    {
      label: 'Members',
      to: `/${orgShortCode}/settings/org/users/members`,
      icon: <Users />
    },
    {
      label: 'Invites',
      to: `/${orgShortCode}/settings/org/users/invites`,
      icon: <UserPlus />
    },
    {
      label: 'Teams',
      to: `/${orgShortCode}/settings/org/users/teams`,
      icon: <HandHeart />
    }
  ];
  const orgMailLinks: NavLinks[] = [
    {
      label: 'Domains',
      to: `/${orgShortCode}/settings/org/mail/domains`,
      icon: <Globe />
    },
    {
      label: 'Email Addresses',
      to: `/${orgShortCode}/settings/org/mail/addresses`,
      icon: <At />
    }
  ];

  return (
    <Flex
      gap="4"
      className="bg-sand-2 dark:bg-slatedark-2  h-full w-[400px] flex-col  p-2 px-4">
      <Text
        size="5"
        weight="bold"
        color="gray">
        Personal
      </Text>
      <Flex
        className="flex-col"
        gap="1">
        {personalLinks.map(({ label, to, icon }) => (
          <Link
            key={to}
            href={to}>
            <Flex
              gap="4"
              className={cn(
                pathname === to ? 'dark:bg-gray-10 bg-gray-4' : '',
                'rounded p-1 pl-2'
              )}>
              {icon}
              <div>{label}</div>
            </Flex>
          </Link>
        ))}
      </Flex>
      {isAdmin && (
        <Container className="border-t pt-1">
          <Text
            size="5"
            weight="bold"
            color="gray">
            Organization
          </Text>

          <Flex
            className="flex-col pt-4"
            gap="1">
            <Text
              className="pb-1 pl-1"
              size="3"
              weight="bold"
              color="cyan">
              Setup
            </Text>
            {orgSetupLinks.map(({ label, to, icon }) => (
              <Link
                key={to}
                href={to}>
                <Flex
                  gap="4"
                  className={cn(
                    pathname === to ? 'dark:bg-gray-10 bg-gray-4' : '',
                    'rounded p-1 pl-2'
                  )}>
                  {icon}
                  <div>{label}</div>
                </Flex>
              </Link>
            ))}
          </Flex>
          <Flex
            className="flex-col"
            gap="1">
            <Text
              className="pb-1 pl-1"
              size="3"
              weight="bold"
              color="cyan">
              Users
            </Text>
            {orgUserLinks.map(({ label, to, icon }) => (
              <Link
                key={to}
                href={to}>
                <Flex
                  gap="4"
                  className={cn(
                    pathname === to ? 'dark:bg-gray-10 bg-gray-4' : '',
                    'rounded p-1 pl-2'
                  )}>
                  {icon}
                  <div>{label}</div>
                </Flex>
              </Link>
            ))}
          </Flex>

          <Flex
            className="flex-col"
            gap="1">
            <Text
              className="pb-1 pl-1"
              size="3"
              weight="bold"
              color="cyan">
              Mail
            </Text>
            {orgMailLinks.map(({ label, to, icon }) => (
              <Link
                key={to}
                href={to}>
                <Flex
                  gap="4"
                  className={cn(
                    pathname === to ? 'dark:bg-gray-10 bg-gray-4' : '',
                    'rounded p-1 pl-2'
                  )}>
                  {icon}
                  <div>{label}</div>
                </Flex>
              </Link>
            ))}
          </Flex>
        </Container>
      )}
    </Flex>
  );
}
