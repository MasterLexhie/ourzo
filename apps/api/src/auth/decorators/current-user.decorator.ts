import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface RequestWithUser {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerifiedAt: Date | null;
  };
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
