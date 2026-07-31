import { Module } from '@nestjs/common';
import { GeodataModule } from '../geodata/geodata.module';
import { MyActivityTracksController, TracksController, UserActivityTracksController } from './tracks.controller';
import { TracksService } from './tracks.service';

@Module({
  imports: [GeodataModule],
  controllers: [TracksController, UserActivityTracksController, MyActivityTracksController],
  providers: [TracksService],
})
export class TracksModule {}
