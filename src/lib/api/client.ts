/**
 * NiniMed Central API Client
 * Type-safe fetch wrapper with error handling and standardized response payloads.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: json.error || `HTTP ${res.status}: ${res.statusText}`,
        details: json.details,
      };
    }

    return json;
  } catch (err: any) {
    console.error(`[API Client Error] ${url}:`, err);
    return {
      success: false,
      error: err.message || "Network request failed",
    };
  }
}
