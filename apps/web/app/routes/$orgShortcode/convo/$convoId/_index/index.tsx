import { ConvoView, ConvoNotFound } from '../_components/convo-views';
import { useCurrentConvoId } from '@/hooks/use-params';

export default function ConvoPage() {
  const convoId = useCurrentConvoId();
  if (!convoId) return <ConvoNotFound />;
  return <ConvoView convoId={convoId} />;
}
