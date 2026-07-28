import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { MasterDataModule } from './master-data/master-data.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule, MasterDataModule],
  controllers: [HealthController],
})
export class AppModule {}
