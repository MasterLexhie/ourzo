import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRole } from '../roles';
import { SYSTEM_ROLES_KEY } from '@/authorization';

interface RequestWithSystemUser {
  user: {
    id: string;
    email: string;
    systemRoles: SystemRole[];
  } | null;
}

@Injectable()
export class SystemRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(
      SYSTEM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithSystemUser>();
    const user = request.user;

    if (!user || !user.systemRoles) {
      throw new ForbiddenException('System admin access required');
    }

    const hasRequiredRole = requiredRoles.some((role) =>
      user.systemRoles.includes(role),
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Insufficient system permissions. Required: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
