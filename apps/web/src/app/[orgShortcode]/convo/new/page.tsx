'use client';
import CreateConvoForm from '../_components/create-convo-form';
import { useQueryState } from 'nuqs';

export default function Page() {
  const [emails] = useQueryState('emails', { parse: (v) => v?.split(',') });

  return <CreateConvoForm initialEmails={emails ?? []} />;
}
