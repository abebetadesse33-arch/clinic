"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export interface DynamicResourceResponse<T> {
  success: boolean;
  data: T;
  total?: number;
  message?: string;
}

/**
 * Universal Data Hook Pattern for fetching dynamic, database-driven configuration & domain entities.
 */
export function useDynamicResource<T>(
  resourceName: string,
  params?: Record<string, string | number | boolean | undefined | null>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number | false;
  }
) {
  return useQuery<T>({
    queryKey: [resourceName, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            searchParams.append(key, String(val));
          }
        });
      }
      const queryString = searchParams.toString() ? `?${searchParams.toString()}` : "";
      const res = await fetch(`/api/v1/${resourceName}${queryString}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || `Failed to fetch dynamic resource: ${resourceName}`);
      }
      const json: DynamicResourceResponse<T> = await res.json();
      return json.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 30_000,
    refetchInterval: options?.refetchInterval,
  });
}

/**
 * Universal Mutation Hook for updating, creating, or deleting dynamic configuration & resources.
 */
export function useDynamicMutation<TData = any, TVariables = any>(
  resourceName: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST",
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
    invalidateKeys?: string[];
  }
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const isDelete = method === "DELETE";
      let url = `/api/v1/${resourceName}`;

      // If variable has an id for DELETE / PUT
      if (isDelete && (variables as any)?.id) {
        url = `${url}?id=${encodeURIComponent((variables as any).id)}`;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: isDelete && !(variables as any)?.id ? JSON.stringify(variables) : isDelete ? undefined : JSON.stringify(variables),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || `Failed mutation on ${resourceName}`);
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: (data) => {
      // Invalidate target queries
      queryClient.invalidateQueries({ queryKey: [resourceName] });
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * Real-time SSE subscriber hook that automatically invalidates TanStack Query caches
 * whenever a configuration or data change occurs.
 */
export function useRealtimeConfigSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/v1/events");

      eventSource.addEventListener("config_change", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.resource) {
            queryClient.invalidateQueries({ queryKey: [payload.resource] });
          }
        } catch {}
      });

      eventSource.addEventListener("notification", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.type === "config_invalidation" && payload?.resource) {
            queryClient.invalidateQueries({ queryKey: [payload.resource] });
          }
        } catch {}
      });
    } catch {
      // Fallback if EventSource is not supported or connection fails
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [queryClient]);
}

/**
 * Dynamic Translation Hook (Prompt section 12)
 * Fetches dynamic translation key/value pairs from database.
 */
export function useTranslation(key: string, language: string = "en"): string {
  const { data } = useDynamicResource<Record<string, string>>("translations", {
    language,
    format: "map",
  });
  return data?.[key] || key;
}
