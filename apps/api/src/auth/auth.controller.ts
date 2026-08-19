import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request, Response } from 'express';
import ms from 'ms';
import { AuthService } from './auth.service';
import { ProfilesService } from '../profiles/profiles.service';
import { CurrentUser, AuthenticatedUser } from './decorators/current-user.decorator';
import { AppleMobileLoginDto } from './dto/apple-mobile-login.dto';
import { GoogleMobileLoginDto } from './dto/google-mobile-login.dto';
import { LinkAppleDto } from './dto/link-apple.dto';
import { RefreshTokenBodyDto } from './dto/refresh-token-body.dto';
import { Public } from './decorators/public.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_PATH } from './refresh-cookie';
import { GoogleProfile } from './strategies/google.strategy';
import { decodeState } from './state.util';

// ThrottlerGuard applied here rather than globally (see AuthModule) - the
// budget belongs to login/refresh, not to unrelated high-traffic endpoints
// like map bbox panning.
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly profilesService: ProfilesService,
  ) {}

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // guard redirects to Google's consent screen; handler body never runs
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('state') state: string,
  ) {
    const { redirectUrl } = decodeState(state);
    const profile = req.user as GoogleProfile;
    const { accessToken, refreshToken } = await this.authService.handleGoogleLogin(profile);

    this.setRefreshCookie(res, refreshToken);
    res.redirect(`${redirectUrl}/auth/callback#access_token=${accessToken}`);
  }

  // RN has no shared browser cookie jar, so apps/mobile sends its Google ID
  // token here instead of bouncing through /auth/google's redirect flow -
  // MOBILE_PLAN.md Phase 0. Same identity resolution as the browser
  // callback under the hood (AuthService.loginWithIdentity), so there's
  // still exactly one place that creates users.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('google/mobile')
  async googleMobileLogin(@Body() dto: GoogleMobileLoginDto) {
    return this.authService.handleGoogleMobileLogin(dto.idToken);
  }

  // Sign in with Apple - MOBILE_PLAN.md Phase 7. iOS-only on the client
  // side (no Apple sign-in requirement exists for Android/web), but nothing
  // here is iOS-specific: it's the same JSON-login shape as
  // POST /auth/google/mobile.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('apple/mobile')
  async appleMobileLogin(@Body() dto: AppleMobileLoginDto) {
    return this.authService.handleAppleMobileLogin(dto.identityToken, dto.fullName);
  }

  // Attaches Apple as a second identity on the caller's own account -
  // requires auth (not @Public), since this is "link", not "log in as".
  // See AuthService.linkAppleIdentity for why the private-relay email case
  // needs an explicit flow instead of resolveIdentity's auto-link.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('link/apple')
  async linkApple(@CurrentUser() user: AuthenticatedUser, @Body() dto: LinkAppleDto) {
    await this.authService.linkAppleIdentity(user.userId, dto.identityToken);
    return { success: true };
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Body() body: RefreshTokenBodyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Cookie takes priority (unchanged web behavior); body is only
    // consulted when there's no cookie to read, e.g. an RN client.
    const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] ?? body.refreshToken;
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const { accessToken, refreshToken } = await this.authService.refresh(rawRefreshToken);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, refreshToken };
  }

  @Public()
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Body() body: RefreshTokenBodyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] ?? body.refreshToken;
    if (rawRefreshToken) {
      await this.authService.logout(rawRefreshToken);
    }
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: REFRESH_TOKEN_PATH });
    return { success: true };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    // avatarUrl isn't in the JWT payload (see ProfilesService.getAvatarUrl's
    // comment), so this is the one deliberate DB hit on an otherwise
    // stateless-JWT auth path - acceptable since /auth/me is a session
    // bootstrap call, not something hit on every request the way the guard
    // itself is.
    const avatarUrl = await this.profilesService.getAvatarUrl(user.userId);
    return { ...user, avatarUrl };
  }

  @Get('identities')
  async identities(@CurrentUser() user: AuthenticatedUser) {
    return { providers: await this.authService.listIdentities(user.userId) };
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      // Pre-existing bug (MOBILE_PLAN.md Phase 0, item 4): this was never
      // set, so the refresh cookie went over plain HTTP in production too.
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: REFRESH_TOKEN_PATH,
      maxAge: ms(this.configService.get<string>('JWT_REFRESH_TTL')!),
    });
  }
}
