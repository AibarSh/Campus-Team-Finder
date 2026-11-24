import { useEffect, useState } from 'react';

export function useFocusRefresh() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setVersion((previous) => previous + 1);
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  return version;
}
