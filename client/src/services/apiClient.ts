import { ApiException } from '../types/api.js';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;

  let url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const defaultHeaders: HeadersInit = {
    Accept: 'application/json',
    ...(customConfig.body && !(customConfig.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...headers,
  };

  try {
    const response = await fetch(url, {
      ...customConfig,
      headers: defaultHeaders,
      credentials: 'include',
    });

    // Check for HTTP errors
    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      let errorCode: string | undefined;
      let errorDetails: unknown;

      try {
        const errorData = await response.json();
        if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        }
        errorCode = errorData?.error?.code || errorData?.code;
        errorDetails = errorData?.error?.details || errorData?.details;
      } catch {
        // Response was not JSON
      }

      if (response.status === 401) {
        // Unauthorized - future phases can trigger session expiration events
      }

      throw new ApiException(errorMessage, response.status, errorCode, errorDetails);
    }

    // For 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();
    return data as T;
  } catch (err: unknown) {
    if (err instanceof ApiException) {
      throw err;
    }

    // Network error or fetch abort
    const message = err instanceof Error ? err.message : 'Network request failed';
    throw new ApiException(
      `Unable to connect to ApnaVault server (${message}). Please verify the backend is running.`,
      0,
      'NETWORK_ERROR'
    );
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  getBaseUrl: () => BASE_URL,
};
