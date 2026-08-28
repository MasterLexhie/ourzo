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
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import {
  InvitationResponseDto,
  InvitationListResponseDto,
  AcceptInvitationResponseDto,
} from './dto/invitation-response.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { WorkspaceContextGuard } from '@/authorization/guards/workspace-context.guard';
import { WorkspaceRolesGuard } from '@/authorization/guards/workspace-roles.guard';
import { WorkspaceRoles } from '@/authorization/decorators/workspace-roles.decorator';
import {
  CurrentUser,
  CurrentWorkspaceMembership,
} from '@/auth/decorators/current-user.decorator';
import { WorkspaceRole } from '@/authorization/roles';

@ApiTags('Invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @UseGuards(WorkspaceContextGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.Owner, WorkspaceRole.Admin)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new invitation' })
  @ApiResponse({
    status: 201,
    description: 'Invitation created successfully',
    type: InvitationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({
    status: 409,
    description: 'User already a member or invitation exists',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Body() dto: CreateInvitationDto,
  ): Promise<InvitationResponseDto> {
    return this.invitationsService.create(user.id, membership.workspaceId, dto);
  }

  @Get()
  @UseGuards(WorkspaceContextGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.Owner, WorkspaceRole.Admin)
  @ApiOperation({ summary: 'List all invitations for the workspace' })
  @ApiResponse({
    status: 200,
    description: 'List of invitations',
    type: InvitationListResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
  ): Promise<InvitationListResponseDto> {
    return this.invitationsService.findAllForWorkspace(
      user.id,
      membership.workspaceId,
    );
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation' })
  @ApiResponse({
    status: 200,
    description: 'Invitation accepted successfully',
    type: AcceptInvitationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired invitation' })
  @ApiResponse({
    status: 403,
    description: 'Invitation is for a different email',
  })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({ status: 409, description: 'User already a member' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async accept(
    @CurrentUser() user: { id: string },
    @Body() dto: AcceptInvitationDto,
  ): Promise<AcceptInvitationResponseDto> {
    return this.invitationsService.accept(dto, user.id);
  }

  @Delete(':invitationId')
  @UseGuards(WorkspaceContextGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.Owner, WorkspaceRole.Admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an invitation' })
  @ApiParam({ name: 'invitationId', description: 'Invitation ID' })
  @ApiResponse({ status: 200, description: 'Invitation revoked successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({ status: 400, description: 'Invitation cannot be revoked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async revoke(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Param('invitationId') invitationId: string,
  ): Promise<{ message: string }> {
    return this.invitationsService.revoke(
      user.id,
      membership.workspaceId,
      invitationId,
    );
  }
}
