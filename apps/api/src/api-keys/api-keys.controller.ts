import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import {
  ApiKeyResponseDto,
  ApiKeyListResponseDto,
  CreateApiKeyResponseDto,
} from './dto/api-key-response.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RateLimitGuard } from '@/rate-limit/rate-limit.guard';
import { RateLimit } from '@/rate-limit/decorators/rate-limit.decorator';
import { WorkspaceContextGuard } from '@/authorization/guards/workspace-context.guard';
import { WorkspaceRolesGuard } from '@/authorization/guards/workspace-roles.guard';
import { WorkspaceRoles } from '@/authorization/decorators/workspace-roles.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { CurrentWorkspaceMembership } from '@/auth/decorators/current-user.decorator';
import { WorkspaceRole } from '@/authorization/roles';

@ApiTags('API Keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RateLimitGuard)
@RateLimit('user')
@Controller('api/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @UseGuards(WorkspaceContextGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.Owner)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new API key (shown only once)' })
  @ApiResponse({
    status: 201,
    description: 'API key created successfully (key shown only once)',
    type: CreateApiKeyResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Only owners can create API keys' })
  @ApiResponse({ status: 400, description: 'Invalid scopes or limit reached' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Body() dto: CreateApiKeyDto,
  ): Promise<CreateApiKeyResponseDto> {
    return this.apiKeysService.create(user.id, membership.workspaceId, dto);
  }

  @Get()
  @UseGuards(WorkspaceContextGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.Owner)
  @ApiOperation({ summary: 'List all API keys for the workspace' })
  @ApiResponse({
    status: 200,
    description: 'List of API keys (keys masked)',
    type: ApiKeyListResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Only owners can view API keys' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
  ): Promise<ApiKeyListResponseDto> {
    return this.apiKeysService.findAll(membership.workspaceId);
  }

  @Get(':id')
  @UseGuards(WorkspaceContextGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.Owner)
  @ApiOperation({ summary: 'Get API key details' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({
    status: 200,
    description: 'API key details',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Only owners can view API keys' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Param('id') id: string,
  ): Promise<ApiKeyResponseDto> {
    return this.apiKeysService.findOne(user.id, membership.workspaceId, id);
  }

  @Delete(':id')
  @UseGuards(WorkspaceContextGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.Owner)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 200, description: 'API key revoked successfully' })
  @ApiResponse({ status: 403, description: 'Only owners can revoke API keys' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async revoke(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.apiKeysService.revoke(user.id, membership.workspaceId, id);
  }
}
