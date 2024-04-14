'use client';

import { useCookies } from 'next-client-cookies';

export default function Page() {
  const cookie = useCookies();
  return <div>Secure you account {cookie.get('un-join-username')}</div>;
}
