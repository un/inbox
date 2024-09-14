import { Tooltip, TooltipContent, TooltipTrigger } from './shadcn-ui/tooltip';
import { useTimeAgo } from '../hooks/use-time-ago';
import { ms } from '@u22n/utils/ms';

export function SmartDateTime({
  date,
  relativeUntil = ms('1 day')
}: {
  date: Date;
  relativeUntil?: number;
}) {
  const timeAgo = useTimeAgo(date);
  const showRealDate = date.getTime() - Date.now() > relativeUntil;

  return (
    <Tooltip>
      <TooltipTrigger>
        {showRealDate ? date.toLocaleDateString() : timeAgo}
      </TooltipTrigger>
      <TooltipContent>{date.toLocaleString()}</TooltipContent>
    </Tooltip>
  );
}
