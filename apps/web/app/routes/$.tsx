import { Button } from '@/components/shadcn-ui/button';
import { Link } from '@remix-run/react';

export default function NotFound() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
      <h1 className="text-2xl font-bold">Not Found!</h1>
      <span className="text-base-10 text-balance text-center text-sm font-bold">
        The page you are trying to access does not exist or you do not have
        access to it.
      </span>
      <Button asChild>
        <Link
          to="/"
          reloadDocument>
          Take me home
        </Link>
      </Button>
    </div>
  );
}
