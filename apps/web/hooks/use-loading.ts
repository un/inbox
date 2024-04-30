import { useRef, useState } from 'react';

type Callbacks<T> = {
  onSuccess?: (data: T) => void;
  onError?: (e: Error) => void;
  onSettled?: () => void;
};

// A simple useQuery like hook that handles loading and error states,
// useful for doing dependent async functions like passkey login
export default function useLoading<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  {
    onSuccess = () => {
      /** */
    },
    onError = () => {
      /** */
    },
    onSettled = () => {
      /** */
    }
  }: Callbacks<T> = {}
) {
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
      .then((d) => {
        setData(d);
        onSuccess(d);
      })
      .catch((e: Error) => {
        setError(e);
        onError(e);
      })
      .finally(() => {
        setLoading(false);
        onSettled();
      });
  };
  const clearData = () => setData(null);
  const clearError = () => setError(null);

  return { loading, error, data, run, clearData, clearError };
}
