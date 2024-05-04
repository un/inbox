'use client';
import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { Flex, Text } from '@radix-ui/themes';
import Link from 'next/link';
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
  const pathname = usePathname();
  const [currentUrl, setCurrentUrl] = useState('');
  const { orgShortCode } = useParams();

  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      let endpoint = segments[segments.length - 1];
      if (endpoint === 'addresses') {
        endpoint = `${segments[segments.length - 2]}/${segments[segments.length - 1]}`;
      }
      setCurrentUrl(endpoint || '');
    }
  }, [pathname]);

  const personalLinks = [
    {
      key: 'profile',
      label: 'Profile',
      to: `/${orgShortCode}/settings/user/profile`,
      icon: <CircleUser />
    },
    {
      key: 'user/addresses',
      label: 'Personal Addresses',
      to: `/${orgShortCode}/settings/user/addresses`,
      icon: <Mail />
    },
    {
      key: 'security',
      label: 'Security',
      to: `/${orgShortCode}/settings/user/security`,
      icon: <Lock />
    }
  ];
  const orgSetupLinks = [
    {
      key: 'org',
      label: 'Org Profile',
      to: `/${orgShortCode}/settings/org`,
      icon: <Building2 />
    },
    {
      key: 'billing',
      label: 'Billing',
      to: `/${orgShortCode}/settings/org/setup/billing`,
      icon: <CreditCard />
    }
  ];

  const orgUserLinks = [
    {
      key: 'members',
      label: 'Members',
      to: `/${orgShortCode}/settings/org/users/members`,
      icon: <Users />
    },
    {
      key: 'invites',
      label: 'Invites',
      to: `/${orgShortCode}/settings/org/users/invites`,
      icon: <UserRoundPlus />
    },
    {
      key: 'teams',
      label: 'Teams',
      to: `/${orgShortCode}/settings/org/users/teams`,
      icon: <HeartHandshake />
    }
  ];
  const orgMailLinks = [
    {
      key: 'domains',
      label: 'Domains',
      to: `/${orgShortCode}/settings/org/mail/domains`,
      icon: <Globe />
    },
    {
      key: 'mail/addresses',
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
        # Personal
      </Text>
      <Flex
        className="flex-col"
        gap="1">
        {personalLinks.map(({ key, label, to, icon }) => (
          <Link
            key={key}
            href={to}>
            <Flex
              gap="4"
              className={`${currentUrl === key ? 'dark:bg-gray-10 bg-gray-4' : ''} rounded p-1 pl-2`}>
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
        # Organization
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
              className={`${currentUrl === key ? 'dark:bg-gray-10 bg-gray-4' : ''} rounded p-1 pl-2`}>
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
              className={`${currentUrl === key ? 'dark:bg-gray-10 bg-gray-4' : ''} rounded p-1 pl-2`}>
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
              className={`${currentUrl === key ? 'dark:bg-gray-10 bg-gray-4' : ''} rounded p-1 pl-2`}>
              {icon}
              <div>{label}</div>
            </Flex>
          </Link>
        ))}
      </Flex>
    </Flex>
  );
}
