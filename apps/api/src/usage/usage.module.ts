import { Global, Module } from '@nestjs/common';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';
import { UsageRepository } from './repositories/usage.repository';

@Global()
@Module({
  controllers: [UsageController],
  providers: [UsageService, UsageRepository],
  exports: [UsageService, UsageRepository],
})
export class UsageModule {}
