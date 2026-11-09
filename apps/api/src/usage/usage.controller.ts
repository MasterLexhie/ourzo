import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsageService } from './usage.service';
import { UsageResponseDto } from './dto/usage-response.dto';
import { JwtOrApiKeyGuard } from '@/api-keys/guards/jwt-or-api-key.guard';
import { ApiKeyScopesGuard } from '@/api-keys/guards/api-key-scopes.guard';
import { RequireScopes } from '@/api-keys/decorators/require-scopes.decorator';
import { RateLimitGuard } from '@/rate-limit/rate-limit.guard';
import { RateLimit } from '@/rate-limit/decorators/rate-limit.decorator';
import { WorkspaceContextGuard } from '@/authorization/guards/workspace-context.guard';
import { WorkspaceRolesGuard } from '@/authorization/guards/workspace-roles.guard';
import { WorkspaceRoles } from '@/authorization/decorators/workspace-roles.decorator';
import { CurrentWorkspaceMembership } from '@/auth/decorators/current-user.decorator';
import { WorkspaceRole } from '@/authorization/roles';

@ApiTags('Usage')
@ApiBearerAuth()
@UseGuards(JwtOrApiKeyGuard, ApiKeyScopesGuard, RateLimitGuard)
@RateLimit('user')
@Controller('api/usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  @RequireScopes('usage:read')
  @UseGuards(WorkspaceContextGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.Owner, WorkspaceRole.Admin)
  @ApiOperation({ summary: 'Get current workspace usage vs limits' })
  @ApiResponse({
    status: 200,
    description: 'Workspace usage details',
    type: UsageResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUsage(
    @CurrentWorkspaceMembership()
    membership: {
      workspaceId: string;
    },
  ): Promise<UsageResponseDto> {
    return this.usageService.getUsage(membership.workspaceId);
  }
}
