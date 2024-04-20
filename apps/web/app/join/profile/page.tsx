'use client';

import Link from 'next/link';
import { useQueryState } from 'nuqs';

// TODO: make profile page

export default function Page() {
  const [org] = useQueryState('org');

  return (
    <div>
      <h1>Profile Page (WIP)</h1>
      <Link href={`/${org}`}>Go to Org</Link>
    </div>
  );
}
