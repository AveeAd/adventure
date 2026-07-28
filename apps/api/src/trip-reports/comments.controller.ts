import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller('trip-reports/:tripReportId/comments')
export class TripReportCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  list(@Param('tripReportId') tripReportId: string) {
    return this.commentsService.listForTripReport(tripReportId);
  }

  @Post()
  create(
    @Param('tripReportId') tripReportId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commentsService.create(tripReportId, user.userId, dto);
  }
}

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCommentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.commentsService.update(id, user, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.commentsService.delete(id, user);
  }
}
