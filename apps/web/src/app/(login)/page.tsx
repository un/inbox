'use client';

import { Button } from '@/src/components/shadcn-ui/button';
import { Separator } from '@/src/components/shadcn-ui/separator';
import { Badge } from '@/src/components/shadcn-ui/badge';
import { PasskeyLoginButton } from './_components/passkey-login';
import { Key } from '@phosphor-icons/react';
import Link from 'next/link';

export default function Page() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="-mt-4 text-center">
        <h1 className="mb-2 text-2xl font-medium">Login to your</h1>
        <h2 className="font-display mb-6 text-5xl">UnInbox</h2>
        <div className="py-6">
          <PasskeyLoginButton />
          <div className="flex items-center justify-center gap-2 py-4">
            <Separator className="bg-green-6 w-28" />
            <Badge
              className="uppercase"
              variant="outline">
              or
            </Badge>
            <Separator className="bg-green-6 w-28" />
          </div>
          <div className="flex flex-col items-center justify-center gap-4 py-2">
            <Button
              className="w-72 cursor-pointer gap-2 text-sm font-semibold"
              variant="outline"
              asChild>
              <Link href="/login">
                <Key size={20} />
                <span>Login with Password</span>
              </Link>
            </Button>
            <Button
              className="mt-4 w-72 cursor-pointer text-sm font-semibold"
              variant="secondary"
              asChild>
              <Link href="/join">Not a member yet? Join instead</Link>
            </Button>
          </div>
        </div>
        <Button
          className="w-fit cursor-pointer font-semibold"
          variant="link">
          <Link href="/recovery">Recover your Account</Link>
        </Button>
      </div>
    </div>
  );
}
