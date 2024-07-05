import { validateTypeId } from '@u22n/utils/typeid';
import ConvoView, { ConvoNotFound } from './page-client';
import type { Metadata } from 'next';
import { serverApi } from '@/src/lib/trpc.server';

interface ConvoPageParams {
  orgShortCode: string;
  convoId: string;
}

export async function generateMetadata({
  params
}: {
  params: ConvoPageParams;
}): Promise<Metadata> {
  const currentConvo = await serverApi.convos.getConvo.query({
    orgShortCode: params.orgShortCode,
    convoPublicId: params.convoId
  });

  if (!currentConvo) {
    return {
      title: 'Convo not found',
      description: 'Convo not found',
      icons: '/logo.png'
    };
  }

  const title = currentConvo.data.subjects[0]
    ? currentConvo.data.subjects[0]?.subject
    : 'UnInbox';

  return {
    title: `Convo | ${title}`,
    description: 'View and reply to this conversation',
    icons: '/logo.png'
  };
}

export default function ConvoPage({ params }: { params: ConvoPageParams }) {
  if (!validateTypeId('convos', params.convoId)) {
    return <ConvoNotFound />;
  }

  return <ConvoView convoId={params.convoId} />;
}
