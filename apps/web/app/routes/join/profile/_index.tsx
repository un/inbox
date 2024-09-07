import { ProfileCard } from './_components/profile-card';
import { Link, useSearchParams } from '@remix-run/react';
import { Button } from '@/components/shadcn-ui/button';
import { SpinnerGap } from '@phosphor-icons/react';
import { platform } from '@/lib/trpc';
import Cookies from 'js-cookie';

export default function Page() {
  const [searchParams] = useSearchParams();

  if (!searchParams.get('org')) {
    return (
      <div className="bg-card mx-auto my-4 max-w-[450px] rounded border p-4">
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm font-bold">Missing Org Parameter</div>
          <div className="text-sm">
            If you think this is an error, please contact support.
          </div>
          <Button
            className="mt-4"
            asChild>
            <Link
              to="/"
              reloadDocument>
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const {
    data: orgData,
    error,
    isLoading
  } = platform.account.profile.getOrgMemberProfile.useQuery({
    orgShortcode: searchParams.get('org')!
  });

  if (error && !orgData) {
    return (
      <div className="bg-card mx-auto my-4 max-w-[450px] rounded border p-4">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="text-sm font-bold">Invalid Org Parameter</div>
          <div className="text-red-10 text-sm">
            The Org you are trying to setup a profile for does not exist or you
            do not have permission to access it.
          </div>
          <div className="text-sm">
            If you think this is an error, please contact support.
          </div>
          <Button
            className="mt-2"
            asChild>
            <Link
              to="/"
              reloadDocument>
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const wasInvited = Boolean(Cookies.get('un-invite-code'));
  if (isLoading || !orgData) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2">
        <SpinnerGap
          className="size-6 animate-spin"
          size={24}
        />
        <div className="text-sm">Loading your profile...</div>
      </div>
    );
  }

  return (
    <ProfileCard
      orgData={orgData}
      wasInvited={wasInvited}
    />
  );
}
