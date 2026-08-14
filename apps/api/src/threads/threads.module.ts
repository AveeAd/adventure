import { Module } from '@nestjs/common';
import { ClubsModule } from '../clubs/clubs.module';
import { ThreadRepliesController, ThreadRepliesFlatController } from './thread-replies.controller';
import { ThreadRepliesService } from './thread-replies.service';
import { ClubThreadsController, ThreadsController } from './threads.controller';
import { ThreadsService } from './threads.service';

@Module({
  imports: [ClubsModule],
  controllers: [ClubThreadsController, ThreadsController, ThreadRepliesController, ThreadRepliesFlatController],
  providers: [ThreadsService, ThreadRepliesService],
})
export class ThreadsModule {}
