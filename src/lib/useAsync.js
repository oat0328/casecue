import { useEffect, useState, useCallback } from "react";

// Simple async data hook with loading/error and manual refetch.
export function useAsync(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const run = useCallback(() => {
    let active = true;
    setLoading(true);
    Promise.resolve(fn())
      .then((res) => { if (active) { setData(res); setError(null); } })
      .catch((e) => { if (active) setError(e); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, deps);

  useEffect(() => { const cancel = run(); return cancel; }, [run]);

  return { data, loading, error, refetch: run, setData };
}