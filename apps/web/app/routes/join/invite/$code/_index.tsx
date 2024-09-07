import { InviteCard } from './_components/invite-card';
import { useParams } from '@remix-run/react';

export default function Page() {
  const params = useParams();
  return <InviteCard code={params.code} />;
}
