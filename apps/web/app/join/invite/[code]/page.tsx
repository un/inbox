import InviteCard from './InviteCard';

export default function Page({ params }: { params: { code: string } }) {
  return <InviteCard code={params.code} />;
}
