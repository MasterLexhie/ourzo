const API_BASE_URL: string = import.meta.env.VITE_API_URL;

import {useAuthStore} from '@/stores/auth.store';
import type { Tokens } from '@/types/auth.types';

interface QueuedRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  endpoint: string;
  options: RequestInit & { workspaceId?: string };
}

/** Keeps the in-memory token copy in the auth store (never persisted). */
function storeAccessToken(tokens: Tokens) {
  useAuthStore.setState({ tokens });
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;
  private requestQueue: QueuedRequest[] = [];
  private isRefreshing = false;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  /**
   * Exchanges the httpOnly refresh cookie for a new access token (the
   * server rotates the cookie). The refresh token is never readable by JS.
   */
  async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new ApiError(response.status, 'Session expired', null);
        }

        const tokens = (await response.json()) as Tokens;
        this.accessToken = tokens.accessToken;
        storeAccessToken(tokens);
        return tokens.accessToken;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async processQueue(accessToken: string | null, error: Error | null) {
    const queue = [...this.requestQueue];
    this.requestQueue = [];

    for (const queued of queue) {
      if (error) {
        queued.reject(error);
      } else if (accessToken) {
        try {
          const originalHeaders = queued.options.headers as Record<string, string> | undefined;
          const headers = {
            ...originalHeaders,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          };
          const fetchOptions: RequestInit = {
            ...queued.options,
            headers,
            credentials: 'include',
          };
          const response = await fetch(`${this.baseUrl}${queued.endpoint}`, fetchOptions);

          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            queued.reject(new ApiError(response.status, error.message ?? 'Request failed', error));
          } else if (response.status === 204) {
            queued.resolve(undefined);
          } else {
            const data = await response.json();
            queued.resolve(data);
          }
        } catch (err) {
          queued.reject(err as Error);
        }
      } else {
        queued.reject(new Error('Token refresh failed'));
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { workspaceId?: string } = {},
  ): Promise<T> {
    const {workspaceId, ...fetchOptions} = options;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (workspaceId) {
      (headers as Record<string, string>)['x-workspace-id'] = workspaceId;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      // Auth endpoints report their own 401s (e.g. wrong password); never
      // try to refresh in response to them.
      if (response.status === 401 && this.accessToken && !endpoint.startsWith('/api/auth/')) {
        return this.handle401<T>(endpoint, {...fetchOptions, headers}, workspaceId);
      }

      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, error.message ?? 'Request failed', error);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  private async handle401<T>(
    endpoint: string,
    options: RequestInit & { workspaceId?: string },
    workspaceId?: string,
  ): Promise<T> {
    if (this.isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        this.requestQueue.push({
          resolve: resolve as (value: unknown) => void,
          reject,
          endpoint,
          options: {...options, workspaceId}
        });
      });
    }

    this.isRefreshing = true;

    try {
      const newAccessToken = await this.refreshAccessToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newAccessToken}`,
      };

      if (workspaceId) {
        headers['x-workspace-id'] = workspaceId;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(response.status, error.message ?? 'Request failed', error);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      await this.processQueue(newAccessToken, null);

      return response.json();
    } catch (error) {
      await this.processQueue(null, error as Error);
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  get<T>(endpoint: string, options?: { workspaceId?: string }): Promise<T> {
    return this.request<T>(endpoint, {method: 'GET', ...options});
  }

  post<T>(endpoint: string, data: unknown, options?: { workspaceId?: string }): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  patch<T>(endpoint: string, data: unknown, options?: { workspaceId?: string }): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    });
  }

  delete<T>(endpoint: string, options?: { workspaceId?: string }): Promise<T> {
    return this.request<T>(endpoint, {method: 'DELETE', ...options});
  }
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const apiClient = new ApiClient();
