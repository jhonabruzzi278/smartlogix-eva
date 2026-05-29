import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError, apiClient } from "@/lib/api-client";

export type ApiSource = "live" | "error";

interface UseApiQueryOptions<TResponse, TData> {
  path: string;
  transform: (response: TResponse) => TData;
  enabled?: boolean;
}

interface UseApiQueryResult<TData> {
  data: TData | null;
  loading: boolean;
  error: string | null;
  source: ApiSource;
  refresh: () => void;
}

const mapErrorToMessage = (error: unknown): string => {
  if (error instanceof ApiRequestError) {
    if (error.isUnauthorized) return "Sesion expirada. Vuelve a iniciar sesion.";
    if (error.isForbidden) return "No tienes permisos para este recurso.";
    if (error.isTimeout) return "El backend no respondio a tiempo.";
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "No se pudo conectar al backend.";
};

export function useApiQuery<TResponse, TData>({
  path,
  transform,
  enabled = true
}: UseApiQueryOptions<TResponse, TData>): UseApiQueryResult<TData> {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<ApiSource>("live");
  const [tick, setTick] = useState(0);

  const transformRef = useRef(transform);
  transformRef.current = transform;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    apiClient
      .fetch<TResponse>(path)
      .then((response) => {
        if (cancelled) return;
        setData(transformRef.current(response));
        setError(null);
        setSource("live");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(mapErrorToMessage(err));
        setSource("error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, enabled, tick]);

  return {
    data,
    loading,
    error,
    source,
    refresh: useCallback(() => setTick((t) => t + 1), [])
  };
}
