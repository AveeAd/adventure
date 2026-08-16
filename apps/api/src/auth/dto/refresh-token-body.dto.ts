import { IsOptional, IsString, MinLength } from 'class-validator';

// Body fallback for refresh/logout when there's no shared browser cookie jar
// to read from - RN clients (MOBILE_PLAN.md Phase 0). The cookie still takes
// priority in the controller; this is only consulted when it's absent.
export class RefreshTokenBodyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  refreshToken?: string;
}
