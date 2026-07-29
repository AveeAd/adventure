import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { AdventurePagesController } from './adventure-pages.controller';
import { AdventurePagesService } from './adventure-pages.service';

@Module({
  imports: [UploadsModule],
  controllers: [AdventurePagesController],
  providers: [AdventurePagesService],
})
export class AdventurePagesModule {}
