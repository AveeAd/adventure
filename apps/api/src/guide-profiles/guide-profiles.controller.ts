import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateGuideProfileDto } from './dto/create-guide-profile.dto';
import { UpdateGuideProfileDto } from './dto/update-guide-profile.dto';
import { UpdateVerificationStatusDto } from './dto/update-verification-status.dto';
import { GuideProfilesService } from './guide-profiles.service';

@Controller('guide-profiles')
export class GuideProfilesController {
  constructor(private readonly guideProfilesService: GuideProfilesService) {}

  @Public()
  @Get()
  list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.guideProfilesService.list(Number(page) || 1, Number(pageSize) || 20);
  }

  // must come before ':id' - otherwise Nest would match "me" as an :id
  // (not @Public() - this is inherently about the current authenticated user)
  @Get('me')
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.guideProfilesService.getByUserId(user.userId);
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string) {
    return this.guideProfilesService.get(id);
  }

  @Post()
  create(@Body() dto: CreateGuideProfileDto, @CurrentUser() user: AuthenticatedUser) {
    return this.guideProfilesService.create(user.userId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGuideProfileDto, @CurrentUser() user: AuthenticatedUser) {
    return this.guideProfilesService.update(id, user, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.guideProfilesService.delete(id, user);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/verification-status')
  updateVerificationStatus(@Param('id') id: string, @Body() dto: UpdateVerificationStatusDto) {
    return this.guideProfilesService.updateVerificationStatus(id, dto.status);
  }
}
