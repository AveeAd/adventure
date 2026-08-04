import { Module } from '@nestjs/common';
import { AdventurePagesModule } from '../adventure-pages/adventure-pages.module';
import { GeodataModule } from '../geodata/geodata.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [AdventurePagesModule, GeodataModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
