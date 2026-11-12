'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '@/components/hooks';
import type { PreflightResponse } from '@/features/analytics/lib/preflight-types';

export interface InstallPreflightState {
  data: PreflightResponse | null;
  loading: boolean;
  error: string | null;
}

function isPreflightResponse(value: unknown): value is PreflightResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<PreflightResponse>;

  return (
    (candidate.recommendedMode === 'standard' || candidate.recommendedMode === 'first-party') &&
    Boolean(candidate.csp) &&
    Boolean(candidate.firstParty) &&
    Boolean(candidate.host)
  );
}

/**
 * One preflight request on mount and one per explicit re-check. There is no
 * polling: the event verification endpoint is the only thing that polls.
 */
export function useInstallPreflight(websiteId: string) {
  const { get: apiGet } = useApi();
  const requestId = useRef(0);
  const [state, setState] = useState<InstallPreflightState>({
    data: null,
    loading: true,
    error: null,
  });

  const check = useCallback(async () => {
    const current = requestId.current + 1;
    requestId.current = current;
    setState(previous => ({ ...previous, loading: true, error: null }));

    try {
      const result = await apiGet(`/websites/${websiteId}/onboarding/preflight`);

      if (requestId.current !== current) {
        return;
      }

      setState({
        data: isPreflightResponse(result) ? result : null,
        loading: false,
        error: null,
      });
    } catch (cause) {
      if (requestId.current !== current) {
        return;
      }

      setState({
        data: null,
        loading: false,
        error: cause instanceof Error ? cause.message : 'Could not check the install right now.',
      });
    }
  }, [apiGet, websiteId]);

  useEffect(() => {
    void check();

    return () => {
      requestId.current += 1;
    };
  }, [check]);

  return { ...state, check };
}
