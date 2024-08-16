import { type NextRequest } from 'next/server';
import { redirect } from 'next/navigation';

export function GET(
  _: NextRequest,
  { params }: { params: { orgShortcode: string; spaceShortcode: string } }
) {
  redirect(`/${params.orgShortcode}/${params.spaceShortcode}/convo`);
}
