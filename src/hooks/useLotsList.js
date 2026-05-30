import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

export function useLotsList(role) {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const lotsPath = role === 'OWNER' ? '/api/v1/parking-lots/my' : '/api/v1/parking-lots';
      const lotsResult = await api.get(lotsPath);
      setLots(lotsResult);
    } catch {
      setLots([]);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { lots, loading, refresh };
}
