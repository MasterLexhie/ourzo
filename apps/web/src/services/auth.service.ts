import { apiClient } from './api.client';
import type { AuthResponse, RegisterDto, LoginDto } from '@/types/auth.types';

export const authService = {
  async register(dto: RegisterDto): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/register', dto);
  },

  async login(dto: LoginDto): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/login', dto);
  },

  /** Revokes the session; the server reads and clears the refresh cookie. */
  async logout(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/api/auth/logout', {});
  },

  async me(): Promise<{ id: string; email: string; firstName: string; lastName: string; emailVerifiedAt: string | null }> {
    return apiClient.get('/api/auth/me');
  },
};