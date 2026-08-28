import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface RequestWithWorkspace {
  workspace: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    deletedAt: Date | null;
  };
}

export const CurrentWorkspace = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithWorkspace>();
    return request.workspace;
  },
);
