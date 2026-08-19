import { Body, Controller, Delete, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { UnregisterDeviceTokenDto } from './dto/unregister-device-token.dto';
import { PushService } from './push.service';

// Body-based register/unregister, not a URL param - Expo push tokens
// contain characters (`[`, `]`, `:`) that don't belong in a path, same
// reasoning as Phase 0's body-based refresh/logout for mobile.
@Controller('device-tokens')
export class DeviceTokensController {
  constructor(private readonly pushService: PushService) {}

  @Post()
  register(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterDeviceTokenDto) {
    return this.pushService.registerToken(user.userId, dto.token, dto.platform);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  unregister(@CurrentUser() user: AuthenticatedUser, @Body() dto: UnregisterDeviceTokenDto) {
    return this.pushService.unregisterToken(user.userId, dto.token);
  }
}
