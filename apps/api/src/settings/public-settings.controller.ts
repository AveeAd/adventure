import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SettingsService } from './settings.service';

// Deliberately a separate controller (not a method on SettingsController)
// - that controller carries a class-level @Roles(ADMIN), which RolesGuard
// would still enforce on any method here even with @Public(). No @Roles()
// on this class at all means RolesGuard no-ops and @Public() lets
// JwtAuthGuard through unauthenticated.
@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get('public')
  listPublic() {
    return this.settings.listPublic();
  }
}
