'use client';

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
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { usePathname } from 'next/navigation';
import { platform } from '@/src/lib/trpc';
import { type ReactNode } from 'react';
import { cn } from '@/src/lib/utils';
import Link from 'next/link';

type NavLinks = {
  label: string;
  to: string;
  icon: ReactNode;
};

export default function SettingsSidebar() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);

  const { data: isAdmin } =
    platform.org.users.members.isOrgMemberAdmin.useQuery({
      orgShortcode
    });

  const personalLinks: NavLinks[] = [
    {
      label: 'Profile',
      to: `/${orgShortcode}/settings/user/profile`,
      icon: <User />
    },
    {
      label: 'Personal Addresses',
      to: `/${orgShortcode}/settings/user/addresses`,
      icon: <Envelope />
    },
    {
      label: 'Security',
      to: `/${orgShortcode}/settings/user/security`,
      icon: <Lock />
    }
  ];
  const orgSetupLinks: NavLinks[] = [
    {
      label: 'Org Profile',
      to: `/${orgShortcode}/settings/org`,
      icon: <Buildings />
    },
    {
      label: 'Billing',
      to: `/${orgShortcode}/settings/org/setup/billing`,
      icon: <CreditCard />
    }
  ];

  const orgUserLinks: NavLinks[] = [
    {
      label: 'Members',
      to: `/${orgShortcode}/settings/org/users/members`,
      icon: <Users />
    },
    {
      label: 'Invites',
      to: `/${orgShortcode}/settings/org/users/invites`,
      icon: <UserPlus />
    },
    {
      label: 'Teams',
      to: `/${orgShortcode}/settings/org/users/teams`,
      icon: <HandHeart />
    }
  ];
  const orgMailLinks: NavLinks[] = [
    {
      label: 'Domains',
      to: `/${orgShortcode}/settings/org/mail/domains`,
      icon: <Globe />
    },
    {
      label: 'Email Addresses',
      to: `/${orgShortcode}/settings/org/mail/addresses`,
      icon: <At />
    }
  ];

  return (
    <div className="bg-base-2 flex h-full w-[400px] flex-col gap-4 p-2 px-4">
      <NavBlock
        title="Personal"
        items={personalLinks}
      />

      {isAdmin && (
        <NavSection title="Organization">
          <NavBlock
            title="Setup"
            items={orgSetupLinks}
          />
          <NavBlock
            title="Users"
            items={orgUserLinks}
          />
          <NavBlock
            title="Mail"
            items={orgMailLinks}
          />
        </NavSection>
      )}
    </div>
  );
}

type NavSectionProps = {
  title: string;
  children: ReactNode;
};

function NavSection({ title, children }: NavSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <span className="font-medium">{title}</span>
      {children}
    </div>
  );
}

type NavBlockProps = {
  title: string;
  items: NavLinks[];
};

function NavBlock({ title, items }: NavBlockProps) {
  return (
    <div className="flex flex-col gap-0">
      <span className="font-medium">{title}</span>
      {items.map(({ label, to, icon }) => (
        <NavItem
          label={label}
          to={to}
          icon={icon}
          key={label + to}
        />
      ))}
    </div>
  );
}

type NavItemProps = {
  label: string;
  to: string;
  icon: ReactNode;
};

function NavItem({ label, to, icon }: NavItemProps) {
  const pathname = usePathname();
  return (
    <Link
      key={to}
      href={to}>
      <div
        className={cn(
          pathname === to ? 'bg-gray-4' : '',
          'flex flex-row items-center gap-2 rounded p-1 pl-2'
        )}>
        {icon}
        <div>{label}</div>
      </div>
    </Link>
  );
}
