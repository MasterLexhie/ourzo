import { Global, Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { MembersRepository } from './repositories/members.repository';
import { PrismaModule } from '@/prisma/prisma.module';

/**
 * Global: MembersRepository provides the workspace-membership lookups every
 * tenant-scoped service needs.
 */
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [MembersController],
  providers: [MembersService, MembersRepository],
  exports: [MembersService, MembersRepository],
})
export class MembersModule {}
