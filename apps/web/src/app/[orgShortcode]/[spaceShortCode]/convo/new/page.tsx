'use client';
import CreateConvoForm from '../../../convo/_components/create-convo-form';
import { useQueryState } from 'nuqs';

export default function Page() {
  const [emails] = useQueryState('emails', { parse: (v) => v?.split(',') });
  const [subject] = useQueryState('subject');

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col">
      <CreateConvoForm
        initialEmails={emails ?? []}
        initialSubject={subject ?? ''}
      />
    </div>
  );
}
