import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ThreadRepliesService } from './thread-replies.service';
import { CreateThreadReplyDto } from './dto/create-thread-reply.dto';
import { UpdateThreadReplyDto } from './dto/update-thread-reply.dto';

@Controller('threads/:threadId/replies')
export class ThreadRepliesController {
  constructor(private readonly threadRepliesService: ThreadRepliesService) {}

  @Public()
  @Get()
  list(@Param('threadId') threadId: string) {
    return this.threadRepliesService.listForThread(threadId);
  }

  @Post()
  create(
    @Param('threadId') threadId: string,
    @Body() dto: CreateThreadReplyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.threadRepliesService.create(threadId, user.userId, dto);
  }
}

@Controller('thread-replies')
export class ThreadRepliesFlatController {
  constructor(private readonly threadRepliesService: ThreadRepliesService) {}

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateThreadReplyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.threadRepliesService.update(id, user, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.threadRepliesService.delete(id, user);
  }
}
