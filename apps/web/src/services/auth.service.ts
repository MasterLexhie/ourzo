import { apiClient } from './api.client';
import type { AuthResponse, TokenResponse, RegisterDto, LoginDto, RefreshTokenDto } from '@/types/auth.types';

export const authService = {
  async register(dto: RegisterDto): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/register', dto);
  },

  async login(dto: LoginDto): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/login', dto);
  },

  async refresh(dto: RefreshTokenDto): Promise<TokenResponse> {
    return apiClient.post<TokenResponse>('/api/auth/refresh', dto);
  },

  async logout(refreshToken?: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/api/auth/logout', { refreshToken });
  },

  async me(): Promise<{ id: string; email: string; firstName: string; lastName: string; emailVerifiedAt: string | null }> {
    return apiClient.get('/api/auth/me');
  },
};