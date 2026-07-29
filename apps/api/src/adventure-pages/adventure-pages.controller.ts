import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdventurePagesService } from './adventure-pages.service';
import { AddMediaDto } from './dto/add-media.dto';
import { AddRelatedPageDto } from './dto/add-related-page.dto';
import { CreateAdventurePageDto } from './dto/create-adventure-page.dto';
import { SubmitRevisionDto } from './dto/submit-revision.dto';
import { UpdateAdventurePageMetadataDto } from './dto/update-adventure-page-metadata.dto';
import { UpdateVerificationStatusDto } from './dto/update-verification-status.dto';

@Controller('adventure-pages')
export class AdventurePagesController {
  constructor(private readonly adventurePagesService: AdventurePagesService) {}

  @Public()
  @Get()
  list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.adventurePagesService.list(Number(page) || 1, Number(pageSize) || 20);
  }

  // 2 path segments, so this can't collide with ':id' (1 segment) regardless
  // of declaration order - public pages route by slug (SEO), not UUID
  @Public()
  @Get('slug/:slug')
  getBySlug(@Param('slug') slug: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.adventurePagesService.getBySlug(slug, user?.userId);
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.adventurePagesService.get(id, user?.userId);
  }

  @Post()
  create(@Body() dto: CreateAdventurePageDto, @CurrentUser() user: AuthenticatedUser) {
    return this.adventurePagesService.create(user.userId, dto);
  }

  @Patch(':id')
  updateMetadata(@Param('id') id: string, @Body() dto: UpdateAdventurePageMetadataDto) {
    return this.adventurePagesService.updateMetadata(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.adventurePagesService.delete(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/verification-status')
  updateVerificationStatus(@Param('id') id: string, @Body() dto: UpdateVerificationStatusDto) {
    return this.adventurePagesService.updateVerificationStatus(id, dto.status);
  }

  @Public()
  @Get(':id/revisions')
  listRevisions(@Param('id') id: string) {
    return this.adventurePagesService.listRevisions(id);
  }

  @Public()
  @Get(':id/revisions/:version')
  getRevision(@Param('id') id: string, @Param('version', ParseIntPipe) version: number) {
    return this.adventurePagesService.getRevision(id, version);
  }

  @Public()
  @Get(':id/diff')
  diff(@Param('id') id: string, @Query('from', ParseIntPipe) from: number, @Query('to', ParseIntPipe) to: number) {
    return this.adventurePagesService.diff(id, from, to);
  }

  @Post(':id/revisions')
  submitRevision(
    @Param('id') id: string,
    @Body() dto: SubmitRevisionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adventurePagesService.submitRevision(id, user.userId, dto);
  }

  @Post(':id/revisions/:version/revert')
  revert(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adventurePagesService.revert(id, user.userId, version);
  }

  @Post(':id/confirmations')
  confirm(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adventurePagesService.confirm(id, user.userId);
  }

  @Post(':id/likes')
  like(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adventurePagesService.like(id, user.userId);
  }

  @Delete(':id/likes')
  unlike(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adventurePagesService.unlike(id, user.userId);
  }

  @Post(':id/media')
  addMedia(@Param('id') id: string, @Body() dto: AddMediaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.adventurePagesService.addMedia(id, user.userId, dto);
  }

  @Delete(':id/media/:mediaId')
  removeMedia(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adventurePagesService.removeMedia(id, mediaId, user);
  }

  @Post(':id/related-pages')
  addRelatedPage(@Param('id') id: string, @Body() dto: AddRelatedPageDto) {
    return this.adventurePagesService.addRelatedPage(id, dto.relatedPageId);
  }

  @Delete(':id/related-pages/:relatedPageId')
  removeRelatedPage(@Param('id') id: string, @Param('relatedPageId') relatedPageId: string) {
    return this.adventurePagesService.removeRelatedPage(id, relatedPageId);
  }
}
