'use client';

import { CreateOrg } from './_components/create-org';
import { JoinOrg } from './_components/join-org';
import { useCookies } from 'next-client-cookies';
import Stepper from '../_components/stepper';
import { At } from '@phosphor-icons/react';
import Image from 'next/image';

export default function JoinOrgPage() {
  const cookies = useCookies();
  const inviteCode = cookies.get('un-invite-code');
  const username = cookies.get('un-join-username');
  const hasInviteCode = Boolean(inviteCode);

  return (
    <div className="mx-auto flex w-full max-w-[416px] flex-col gap-5 p-2">
      <div className="flex items-center justify-between">
        <Image
          src="/logo.png"
          alt="UnInbox Logo"
          height={40}
          width={40}
          className="rounded-xl"
        />
        <Stepper
          step={3}
          total={4}
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-base-12 flex items-center gap-2 text-2xl font-medium">
          <span className="whitespace-nowrap">Set up your organization</span>
          {/* Username Cookie might not be available if the user is creating a org later, so we conditionally render it */}
          {username && (
            <div className="border-base-5 shadow-base-4 text-base-12 flex w-fit items-center gap-1 rounded-xl border px-2 py-[6px] text-sm shadow-sm">
              <At
                size={16}
                className="size-4"
              />
              <span className="overflow-hidden whitespace-nowrap">
                {username}
              </span>
            </div>
          )}
        </div>
        <span className="text-base-11 text-pretty text-sm">
          With an organization you can share conversations, notes and email
          identities between members and teams.
        </span>
      </div>
      <div className="flex w-full flex-wrap items-center justify-center gap-2 py-4">
        <CreateOrg />
        <JoinOrg
          hasInviteCode={hasInviteCode}
          inviteCode={inviteCode}
        />
      </div>
      {hasInviteCode && (
        <div className="text-green-10 text-sm font-bold">
          We have detected an invite code! Click on Join to use the code
        </div>
      )}
    </div>
  );
}
