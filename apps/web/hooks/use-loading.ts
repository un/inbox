import { useState } from 'react';

export default function useLoading<T>(fn: () => Promise<T>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  const run = (option?: { clearError?: boolean; clearData?: boolean }) => {
    setLoading(true);
    option?.clearError && setError(null);
    option?.clearData && setData(null);
    setData(null);
    fn()
      .then((d) => setData(d))
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  };
  return { loading, error, data, run };
}
