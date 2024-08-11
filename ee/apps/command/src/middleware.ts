import { type NextRequest, NextResponse } from 'next/server';
import { getAccount } from './lib/get-account';

export default async function middleware(req: NextRequest) {
  const account = await getAccount(req);
  if (!account) {
    return NextResponse.redirect(`${process.env.WEBAPP_URL}`);
  }
  return NextResponse.next();
}
