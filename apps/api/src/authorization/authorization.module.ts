import { Module } from '@nestjs/common';
import { WorkspaceRolesGuard } from './guards/workspace-roles.guard';
import { SystemRolesGuard } from './guards/system-roles.guard';
import { WorkspaceContextGuard } from './guards/workspace-context.guard';

@Module({
  providers: [WorkspaceRolesGuard, SystemRolesGuard, WorkspaceContextGuard],
  exports: [WorkspaceRolesGuard, SystemRolesGuard, WorkspaceContextGuard],
})
export class AuthorizationModule {}
