import InviteCard from './_components/invite-card';

export default function Page({ params }: { params: { code: string } }) {
  return <InviteCard code={params.code} />;
}
