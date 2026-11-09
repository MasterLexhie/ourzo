import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditLogListResponseDto } from './dto/audit-response.dto';
import { JwtOrApiKeyGuard } from '@/api-keys/guards/jwt-or-api-key.guard';
import { ApiKeyScopesGuard } from '@/api-keys/guards/api-key-scopes.guard';
import { RequireScopes } from '@/api-keys/decorators/require-scopes.decorator';
import { RateLimitGuard } from '@/rate-limit/rate-limit.guard';
import { RateLimit } from '@/rate-limit/decorators/rate-limit.decorator';
import { WorkspaceContextGuard } from '@/authorization/guards/workspace-context.guard';
import { WorkspaceRolesGuard } from '@/authorization/guards/workspace-roles.guard';
import { WorkspaceRoles } from '@/authorization/decorators/workspace-roles.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { CurrentWorkspaceMembership } from '@/auth/decorators/current-user.decorator';
import { WorkspaceRole } from '@/authorization/roles';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtOrApiKeyGuard, ApiKeyScopesGuard, RateLimitGuard)
@RateLimit('user')
@Controller('api/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequireScopes('audit:read')
  @UseGuards(WorkspaceContextGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.Owner, WorkspaceRole.Admin)
  @ApiOperation({ summary: 'Query workspace audit logs' })
  @ApiQuery({
    name: 'action',
    required: false,
    description: 'Filter by action (partial match)',
  })
  @ApiQuery({
    name: 'resourceType',
    required: false,
    description: 'Filter by resource type',
  })
  @ApiQuery({
    name: 'actorId',
    required: false,
    description: 'Filter by actor user ID',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date (ISO 8601)',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'List of audit logs',
    type: AuditLogListResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('actorId') actorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<AuditLogListResponseDto> {
    return this.auditService.findAll(user.id, membership.workspaceId, {
      action,
      resourceType,
      actorId,
      startDate,
      endDate,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }
}
