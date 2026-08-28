const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api';

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { workspaceId?: string } = {},
  ): Promise<T> {
    const { workspaceId, ...fetchOptions } = options;
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
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, error.message ?? 'Request failed', error);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: { workspaceId?: string }): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', ...options });
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
    return this.request<T>(endpoint, { method: 'DELETE', ...options });
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