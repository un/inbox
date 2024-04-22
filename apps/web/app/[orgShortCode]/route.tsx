import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

export function GET(
  _: NextRequest,
  { params }: { params: { orgShortCode: string } }
) {
  redirect(`/${params.orgShortCode}/convo`);
}
