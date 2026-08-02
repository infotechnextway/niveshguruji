import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthedRequest } from './jwt-auth.guard';
import { AccessTokenClaims } from '../domain/auth.types';

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessTokenClaims =>
    ctx.switchToHttp().getRequest<AuthedRequest>().principal,
);

export function requestContext(req: { ip?: string; headers: Record<string, unknown> }) {
  return {
    ip: (req.headers['x-real-ip'] as string) ?? req.ip,
    userAgent: req.headers['user-agent'] as string | undefined,
    deviceId: req.headers['x-device-id'] as string | undefined,
  };
}
