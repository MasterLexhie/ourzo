import { Global, Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysRepository } from './repositories/api-keys.repository';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';
import { ApiKeyScopesGuard } from './guards/api-key-scopes.guard';
import { JwtOrApiKeyGuard } from './guards/jwt-or-api-key.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

/**
 * Global so the API-key authentication guards can be applied on any
 * workspace-scoped controller without per-module imports.
 */
@Global()
@Module({
  controllers: [ApiKeysController],
  providers: [
    ApiKeysService,
    ApiKeysRepository,
    ApiKeyAuthGuard,
    ApiKeyScopesGuard,
    JwtOrApiKeyGuard,
    JwtAuthGuard,
  ],
  exports: [
    ApiKeysService,
    ApiKeysRepository,
    ApiKeyAuthGuard,
    ApiKeyScopesGuard,
    JwtOrApiKeyGuard,
    JwtAuthGuard,
  ],
})
export class ApiKeysModule {}
