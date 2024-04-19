import { useRef, useState } from 'react';

export default function useLoading<T>(fn: (signal: AbortSignal) => Promise<T>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  const abortController = useRef(new AbortController());

  const run = (option?: { clearError?: boolean; clearData?: boolean }) => {
    setLoading(true);
    abortController.current.abort();
    abortController.current = new AbortController();
    option?.clearError && setError(null);
    option?.clearData && setData(null);
    setData(null);
    fn(abortController.current.signal)
      .then((d) => setData(d))
      .catch((e: Error) => setError(e))
      .finally(() => setLoading(false));
  };
  return { loading, error, data, run };
}
