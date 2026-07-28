import { BadRequestException, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { encodeState } from '../state.util';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const redirectUrl = request.query.redirectUrl;

    const allowedRedirectUrls = (this.configService.get<string>('ALLOWED_REDIRECT_URLS') ?? '')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);

    if (typeof redirectUrl !== 'string' || !allowedRedirectUrls.includes(redirectUrl)) {
      throw new BadRequestException('redirectUrl is missing or not allowed');
    }

    return { state: encodeState({ redirectUrl }) };
  }
}
