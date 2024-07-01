'use client';

import Stepper from '../_components/stepper';
import CreateOrgButton from './_components/create-org';
import JoinOrgButton from './_components/join-org';
import { useCookies } from 'next-client-cookies';

export default function JoinOrg() {
  const cookies = useCookies();
  const inviteCode = cookies.get('un-invite-code');
  const hasInviteCode = !!inviteCode;

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-4">
      <div className="mt-3 text-lg font-bold">Setup Your Organization</div>
      <Stepper
        step={3}
        total={4}
      />
      <div className="flex flex-col gap-2">
        <div className="text-balance text-sm font-medium">
          With an organization you can share conversations, notes and email
          identities between members and groups.
        </div>
        <div className="text-balance text-sm font-medium">
          If you&apos;re planning on using UnInbox alone, you&apos;ll still need
          an organization to manage all the settings.
        </div>
        <div className="text-balance text-sm font-medium">
          You can be a member of multiple organizations.
        </div>
      </div>
      <div className="flex w-full flex-wrap items-center justify-center gap-2 py-4">
        <CreateOrgButton hasInviteCode={hasInviteCode} />
        <JoinOrgButton
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
