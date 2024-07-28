import type { NextRequest } from 'next/server';
import { redirect } from 'next/navigation';

export function GET(
  _: NextRequest,
  { params }: { params: { orgShortcode: string } }
) {
  redirect(`/${params.orgShortcode}/settings/user/profile`);
}
