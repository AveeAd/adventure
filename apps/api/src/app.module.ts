import { Module } from '@nestjs/common';
import { AdventurePagesModule } from './adventure-pages/adventure-pages.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { GeodataModule } from './geodata/geodata.module';
import { MasterDataModule } from './master-data/master-data.module';
import { PrismaModule } from './prisma/prisma.module';
import { TripReportsModule } from './trip-reports/trip-reports.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    MasterDataModule,
    AdventurePagesModule,
    GeodataModule,
    TripReportsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
