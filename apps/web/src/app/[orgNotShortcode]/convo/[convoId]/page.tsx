'use client';
import { validateTypeId } from '@u22n/utils/typeid';
import { ConvoView, ConvoNotFound } from './_components/convo-views';

export default function ConvoPage({
  params
}: {
  params: {
    convoId: string;
  };
}) {
  if (!validateTypeId('convos', params.convoId)) {
    return <ConvoNotFound />;
  }

  return <ConvoView convoId={params.convoId} />;
}
