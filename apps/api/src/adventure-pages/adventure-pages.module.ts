import { Module } from '@nestjs/common';
import { AdventurePagesController } from './adventure-pages.controller';
import { AdventurePagesService } from './adventure-pages.service';

@Module({
  controllers: [AdventurePagesController],
  providers: [AdventurePagesService],
})
export class AdventurePagesModule {}
