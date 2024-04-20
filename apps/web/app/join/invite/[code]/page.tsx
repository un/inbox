import { isAuthenticated } from '@/lib/trpc.server';
import InviteCard from './InviteCard';

export default async function Page({ params }: { params: { code: string } }) {
  const isSignedIn = await isAuthenticated();
  return (
    <InviteCard
      signedIn={isSignedIn}
      code={params.code}
    />
  );
}
