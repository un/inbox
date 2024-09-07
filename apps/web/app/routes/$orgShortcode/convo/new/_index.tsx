import CreateConvoForm from '../_components/create-convo-form';
import { useSearchParams } from '@remix-run/react';

export default function Page() {
  const [params] = useSearchParams();
  const emails = params.get('emails')?.split(',');
  const subject = params.get('subject');

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col">
      <CreateConvoForm
        initialEmails={emails ?? []}
        initialSubject={subject ?? ''}
      />
    </div>
  );
}
