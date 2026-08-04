import { Controller, Get, Query } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApprovalsService, PendingRevisionTargetType } from './approvals.service';

const VALID_TYPES: PendingRevisionTargetType[] = ['ADVENTURE_PAGE', 'TRAIL', 'SPOT'];

@Controller('revisions')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  // MILESTONE_3.md §9.1: "Review queue route for level-10+ users" - gated
  // inside the service (assertCanViewQueue), not @Roles, since eligibility
  // depends on GuideProfile.guideLevel, not just Role.
  @Get('pending')
  listPending(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type?: string,
    @Query('districtId') districtId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const validType = VALID_TYPES.includes(type as PendingRevisionTargetType)
      ? (type as PendingRevisionTargetType)
      : undefined;
    return this.approvalsService.listPending(user, {
      type: validType,
      districtId,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }
}
