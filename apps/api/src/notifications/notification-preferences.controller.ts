import { Body, Controller, Get, Patch } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { PushService } from './push.service';

@Controller('notification-preferences')
export class NotificationPreferencesController {
  constructor(private readonly pushService: PushService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.pushService.getPreferences(user.userId);
  }

  @Patch()
  update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.pushService.updatePreferences(user.userId, dto);
  }
}
