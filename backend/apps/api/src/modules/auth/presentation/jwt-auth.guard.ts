import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { TokenService } from '../infrastructure/token.service';
import { AccessTokenClaims, ActorKind } from '../domain/auth.types';

export interface AuthedRequest extends Request {
  principal: AccessTokenClaims;
}

function makeGuard(actor: ActorKind) {
  @Injectable()
  class Guard implements CanActivate {
    constructor(public readonly tokens: TokenService) {}

    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest<AuthedRequest>();
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');
      try {
        const claims = this.tokens.verifyAccess(header.slice(7));
        if (claims.actor !== actor) throw new Error('wrong actor');
        req.principal = claims;
        return true;
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }
  }
  return Guard;
}

export const UserAuthGuard = makeGuard('USER');
export const EmployeeAuthGuard = makeGuard('EMPLOYEE');
