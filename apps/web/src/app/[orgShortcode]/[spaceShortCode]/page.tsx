import { redirect } from 'next/navigation';

export default function SpacePage({
  params
}: {
  params: { orgShortcode: string; spaceShortCode: string };
}) {
  redirect(`/${params.orgShortcode}/${params.spaceShortCode}/convo`);
  return null;
}
