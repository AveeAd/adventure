import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AdventurePagesModule } from './adventure-pages/adventure-pages.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { AuthModule } from './auth/auth.module';
import { ClubsModule } from './clubs/clubs.module';
import { ConfigModule } from './config/config.module';
import { ContributionsModule } from './contributions/contributions.module';
import { GeodataModule } from './geodata/geodata.module';
import { GuideProfilesModule } from './guide-profiles/guide-profiles.module';
import { MasterDataModule } from './master-data/master-data.module';
import { ModeratorApplicationsModule } from './moderator-applications/moderator-applications.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { MinVersionMiddleware } from './settings/min-version.middleware';
import { SettingsModule } from './settings/settings.module';
import { TracksModule } from './tracks/tracks.module';
import { ThreadsModule } from './threads/threads.module';
import { TripReportsModule } from './trip-reports/trip-reports.module';
import { TripGroupsModule } from './trip-groups/trip-groups.module';
import { UploadsModule } from './uploads/uploads.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    SettingsModule,
    ContributionsModule,
    NotificationsModule,
    AuthModule,
    MasterDataModule,
    AdventurePagesModule,
    ApprovalsModule,
    ReportsModule,
    GeodataModule,
    TripReportsModule,
    TripGroupsModule,
    ClubsModule,
    ThreadsModule,
    GuideProfilesModule,
    UploadsModule,
    TracksModule,
    ModeratorApplicationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Runs ahead of the global JwtAuthGuard for every route, api-prefixed
    // or not - see MinVersionMiddleware for why (blocks sign-in itself,
    // not just already-authenticated routes).
    consumer.apply(MinVersionMiddleware).forRoutes('*');
  }
}
