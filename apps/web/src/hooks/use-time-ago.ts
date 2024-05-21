import { intlFormatDistance } from 'date-fns';
import { ms } from '@u22n/utils/ms';
import { useState, useEffect } from 'react';

export default function useTimeAgo(
  time: Date,
  {
    updateInterval = ms('1 minute'),
    liveUpdate = true
  }: {
    updateInterval?: number;
    liveUpdate?: boolean;
  } = {}
) {
  const [timeAgo, setTimeAgo] = useState(() =>
    intlFormatDistance(time, Date.now())
  );
  useEffect(() => {
    if (!liveUpdate) return;
    const interval = setInterval(
      () => setTimeAgo(intlFormatDistance(time, Date.now())),
      updateInterval
    );
    return () => clearInterval(interval);
  }, [time, updateInterval, liveUpdate]);
  return timeAgo;
}
