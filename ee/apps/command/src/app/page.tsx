import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Page() {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Command Panel</h1>
      <div className="flex gap-2">
        <Link href="/skiff">
          <Button>Skiff Offer</Button>
        </Link>
        <Link href="/unin">
          <Button>Unin Offer</Button>
        </Link>
        <Link href="/password-reset">
          <Button>Password Reset</Button>
        </Link>
        <Link href="/remove-expired-sessions">
          <Button>Remove Expired Sessions</Button>
        </Link>
      </div>
    </div>
  );
}
