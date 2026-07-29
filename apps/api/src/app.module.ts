import { Module } from '@nestjs/common';
import { AdventurePagesModule } from './adventure-pages/adventure-pages.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { GeodataModule } from './geodata/geodata.module';
import { GuideProfilesModule } from './guide-profiles/guide-profiles.module';
import { MasterDataModule } from './master-data/master-data.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { TripReportsModule } from './trip-reports/trip-reports.module';
import { TripGroupsModule } from './trip-groups/trip-groups.module';
import { UploadsModule } from './uploads/uploads.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    NotificationsModule,
    AuthModule,
    MasterDataModule,
    AdventurePagesModule,
    GeodataModule,
    TripReportsModule,
    TripGroupsModule,
    GuideProfilesModule,
    UploadsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
