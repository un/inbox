import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

export function GET(
  _: NextRequest,
  { params }: { params: { orgShortcode: string } }
) {
  redirect(`/${params.orgShortcode}/convo`);
}
