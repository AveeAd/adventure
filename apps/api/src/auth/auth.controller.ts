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
import { CurrentUser, AuthenticatedUser } from './decorators/current-user.decorator';
import { GoogleMobileLoginDto } from './dto/google-mobile-login.dto';
import { RefreshTokenBodyDto } from './dto/refresh-token-body.dto';
import { Public } from './decorators/public.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GoogleProfile } from './strategies/google.strategy';
import { decodeState } from './state.util';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const REFRESH_TOKEN_PATH = '/api/v1/auth';

// ThrottlerGuard applied here rather than globally (see AuthModule) - the
// budget belongs to login/refresh, not to unrelated high-traffic endpoints
// like map bbox panning.
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
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
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
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
