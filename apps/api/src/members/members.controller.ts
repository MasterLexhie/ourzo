import {
  Controller,
  Get,
  Post,
  Patch,
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
import { MembersService } from './members.service';
import {
  UpdateMemberRoleDto,
  TransferOwnershipDto,
} from './dto/update-member.dto';
import {
  MemberResponseDto,
  MemberListResponseDto,
} from './dto/member-response.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { WorkspaceContextGuard } from '@/authorization/guards/workspace-context.guard';
import { WorkspaceRolesGuard } from '@/authorization/guards/workspace-roles.guard';
import { WorkspaceRoles } from '@/authorization/decorators/workspace-roles.decorator';
import {
  CurrentUser,
  CurrentWorkspaceMembership,
} from '@/auth/decorators/current-user.decorator';
import { WorkspaceRole } from '@/authorization/roles';

@ApiTags('Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @UseGuards(WorkspaceContextGuard)
  @ApiOperation({ summary: 'List all members of the workspace' })
  @ApiResponse({
    status: 200,
    description: 'List of members',
    type: MemberListResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not a member of this workspace' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
  ): Promise<MemberListResponseDto> {
    return this.membersService.findAllForWorkspace(
      user.id,
      membership.workspaceId,
    );
  }

  @Patch(':userId/role')
  @UseGuards(WorkspaceContextGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.Owner, WorkspaceRole.Admin)
  @ApiOperation({ summary: 'Update a member role' })
  @ApiParam({ name: 'userId', description: 'Target user ID' })
  @ApiResponse({
    status: 200,
    description: 'Member role updated successfully',
    type: MemberResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @ApiResponse({ status: 400, description: 'Invalid operation' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateRole(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<MemberResponseDto> {
    return this.membersService.updateRole(
      user.id,
      membership.workspaceId,
      targetUserId,
      dto,
    );
  }

  @Delete(':userId')
  @UseGuards(WorkspaceContextGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.Owner, WorkspaceRole.Admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from the workspace' })
  @ApiParam({ name: 'userId', description: 'Target user ID' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @ApiResponse({ status: 400, description: 'Invalid operation' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Param('userId') targetUserId: string,
  ): Promise<{ message: string }> {
    return this.membersService.removeMember(
      user.id,
      membership.workspaceId,
      targetUserId,
    );
  }

  @Post('transfer-ownership')
  @UseGuards(WorkspaceContextGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.Owner)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer ownership to another member' })
  @ApiResponse({
    status: 200,
    description: 'Ownership transferred successfully',
    type: MemberResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Only owners can transfer ownership',
  })
  @ApiResponse({ status: 404, description: 'Target user not found' })
  @ApiResponse({ status: 400, description: 'Invalid operation' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async transferOwnership(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Body() dto: TransferOwnershipDto,
  ): Promise<MemberResponseDto> {
    return this.membersService.transferOwnership(
      user.id,
      membership.workspaceId,
      dto,
    );
  }
}
