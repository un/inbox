'use client';

import {
  ConvoView,
  ConvoNotFound
} from '../../../convo/[convoId]/_components/convo-views';
import { validateTypeId } from '@u22n/utils/typeid';

export default function SpaceConvoPage({
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
