import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import {ConfigService} from "@nestjs/config";

@Global()
@Module({
  providers: [{
    provide:PrismaService,
    useFactory: (configService: ConfigService) => {
      const connectionString = configService.getOrThrow<string>('DATABASE_URL');
      return new PrismaService(connectionString);
    },
    inject: [ConfigService],
  }],
  exports: [PrismaService],
})
export class PrismaModule {}
