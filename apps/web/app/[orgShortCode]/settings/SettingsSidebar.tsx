'use client';
import { usePathname } from 'next/navigation';
import { Flex, Text } from '@radix-ui/themes';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useGlobalStore } from '@/providers/global-store-provider';
import {
  CircleUser,
  Mail,
  Lock,
  Building2,
  CreditCard,
  AtSign,
  Globe,
  Users,
  UserRoundPlus,
  HeartHandshake
} from 'lucide-react';

export default function SettingsSidebar() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const pathname = usePathname();

  const personalLinks = [
    {
      label: 'Profile',
      to: `/${orgShortCode}/settings/user/profile`,
      icon: <CircleUser />
    },
    {
      label: 'Personal Addresses',
      to: `/${orgShortCode}/settings/user/addresses`,
      icon: <Mail />
    },
    {
      label: 'Security',
      to: `/${orgShortCode}/settings/user/security`,
      icon: <Lock />
    }
  ];
  const orgSetupLinks = [
    {
      label: 'Org Profile',
      to: `/${orgShortCode}/settings/org`,
      icon: <Building2 />
    },
    {
      label: 'Billing',
      to: `/${orgShortCode}/settings/org/setup/billing`,
      icon: <CreditCard />
    }
  ];

  const orgUserLinks = [
    {
      label: 'Members',
      to: `/${orgShortCode}/settings/org/users/members`,
      icon: <Users />
    },
    {
      label: 'Invites',
      to: `/${orgShortCode}/settings/org/users/invites`,
      icon: <UserRoundPlus />
    },
    {
      label: 'Teams',
      to: `/${orgShortCode}/settings/org/users/teams`,
      icon: <HeartHandshake />
    }
  ];
  const orgMailLinks = [
    {
      label: 'Domains',
      to: `/${orgShortCode}/settings/org/mail/domains`,
      icon: <Globe />
    },
    {
      label: 'Email Addresses',
      to: `/${orgShortCode}/settings/org/mail/addresses`,
      icon: <AtSign />
    }
  ];

  return (
    <Flex
      gap="4"
      className="bg-slate-2 dark:bg-slatedark-2  h-full w-[400px] flex-col  p-2 px-4">
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
      <Text
        className="border-t pt-4"
        size="5"
        weight="bold"
        color="gray">
        Organization
      </Text>

      <Flex
        className="flex-col"
        gap="1">
        <Text
          className="pb-1 pl-1"
          size="3"
          weight="bold"
          color="cyan">
          Setup
        </Text>
        {orgSetupLinks.map(({ key, label, to, icon }) => (
          <Link
            key={key}
            href={to}>
            <Flex
              gap="4"
              className={cn(
                pathname === key ? 'dark:bg-gray-10 bg-gray-4' : '',
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
        {orgUserLinks.map(({ key, label, to, icon }) => (
          <Link
            key={key}
            href={to}>
            <Flex
              gap="4"
              className={cn(
                pathname === key ? 'dark:bg-gray-10 bg-gray-4' : '',
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
        {orgMailLinks.map(({ key, label, to, icon }) => (
          <Link
            key={key}
            href={to}>
            <Flex
              gap="4"
              className={cn(
                pathname === key ? 'dark:bg-gray-10 bg-gray-4' : '',
                'rounded p-1 pl-2'
              )}>
              {icon}
              <div>{label}</div>
            </Flex>
          </Link>
        ))}
      </Flex>
    </Flex>
  );
}
