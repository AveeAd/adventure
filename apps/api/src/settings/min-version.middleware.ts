import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { SettingsService } from './settings.service';

// Numeric x.y.z compare, missing segments treated as 0 ("1.2" < "1.2.1").
// Returns null (not a compare result) on anything that doesn't parse, so
// callers can fail open on a malformed version rather than lock everyone
// out over a bad header/setting value.
function compareVersions(a: string, b: string): number | null {
  const parse = (v: string) => {
    const parts = v.trim().split('.').map(Number);
    return parts.every((n) => Number.isInteger(n) && n >= 0) ? parts : null;
  };
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return null;
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// Applied to every route (see AppModule.configure). Only apps/mobile sends
// X-Client-Version (apps/public/apps/admin never do), so this is a no-op
// for browser traffic. Runs ahead of auth so a stale client is blocked from
// signing in too, not just from authenticated routes.
@Injectable()
export class MinVersionMiddleware implements NestMiddleware {
  constructor(private readonly settings: SettingsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const clientVersion = req.header('X-Client-Version');
    if (!clientVersion) {
      next();
      return;
    }

    const minVersion = this.settings.get('mobile.minVersion');
    const cmp = compareVersions(clientVersion, minVersion);
    if (cmp !== null && cmp < 0) {
      res.status(426).json({
        statusCode: 426,
        error: 'Upgrade Required',
        message: 'This app version is no longer supported. Please update to continue.',
        minVersion,
      });
      return;
    }

    next();
  }
}
