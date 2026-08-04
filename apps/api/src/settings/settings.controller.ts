import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingsService } from './settings.service';

// MILESTONE_3.md §6/§2.1: "Admin-only edit; every write is logged with
// updatedById." Moderators are explicitly excluded from editing system
// settings per §2.1's restriction list, so this whole controller (reads
// included - the values are the approval economy's live thresholds) is
// admin-only rather than following the read+moderate pattern other admin
// resources use.
@Roles(Role.ADMIN)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  list() {
    return this.settings.list();
  }

  @Patch(':key')
  async update(@Param('key') key: string, @Body() dto: UpdateSettingDto, @CurrentUser() user: AuthenticatedUser) {
    await this.settings.set(key, dto.value, user.userId);
    return this.settings.list().find((row) => row.key === key);
  }
}
