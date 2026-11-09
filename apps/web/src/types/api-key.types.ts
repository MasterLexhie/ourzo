export interface ApiKeyScope {
  scope: string;
}

export interface ApiKey {
  id: string;
  workspaceId: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface ApiKeyListResponse {
  apiKeys: ApiKey[];
}

export interface CreateApiKeyResponse {
  id: string;
  key: string;
  name: string;
  scopes: ApiKeyScope[];
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyDto {
  name: string;
  scopes: ApiKeyScope[];
  expiresAt?: string;
}