'use client';

import { ConvoView, ConvoNotFound } from './_components/convo-views';
import { validateTypeId } from '@u22n/utils/typeid';

export default function ConvoPage({
  params
}: {
  params: {
    convoId: string;
  };
}) {
  return (
    <>
      {!validateTypeId('convos', params.convoId) ? (
        <ConvoNotFound />
      ) : (
        <ConvoView convoId={params.convoId} />
      )}
    </>
  );
}
