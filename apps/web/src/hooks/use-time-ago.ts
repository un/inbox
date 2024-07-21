import { useState, useEffect, useCallback } from 'react';
import { intlFormatDistance } from 'date-fns';
import { ms } from '@u22n/utils/ms';

function format(time: Date) {
  return intlFormatDistance(time, new Date());
}

function calculateOptimalInterval(time: Date) {
  const diff = new Date().getTime() - time.getTime();
  if (diff < ms('1 minute')) return ms('1 second');
  if (diff < ms('1 hour')) return ms('1 minutes');
  return ms('1 hour');
}

export function useTimeAgo(time: Date) {
  const [timeAgo, setTimeAgo] = useState(() => format(time));
  const [updateInterval, setUpdateInterval] = useState(() =>
    calculateOptimalInterval(time)
  );
  const updateInfo = useCallback(() => {
    setTimeAgo(format(time));
    setUpdateInterval(calculateOptimalInterval(time));
  }, [time]);

  useEffect(() => {
    updateInfo();
    const interval = setInterval(() => updateInfo(), updateInterval);
    return () => clearInterval(interval);
  }, [time, updateInfo, updateInterval]);

  return timeAgo;
}
