import { Body, Controller, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AppException, DomainError, Result } from '@app/shared';
import { EmployeeAuthService } from '../application/employee-auth.service';
import { EmployeeLoginDto, TotpEnableDto } from './dto/auth.dtos';
import { EmployeeAuthGuard } from './jwt-auth.guard';
import { CurrentPrincipal, requestContext } from './current-principal.decorator';
import { AccessTokenClaims } from '../domain/auth.types';

function unwrap<T>(result: Result<T, DomainError>): T {
  if (result.isFail) {
    const status =
      result.error.code === 'AUTH_FAILED' || result.error.code === 'TOTP_INVALID'
        ? HttpStatus.UNAUTHORIZED
        : result.error.code === 'TOTP_REQUIRED'
          ? HttpStatus.FORBIDDEN
          : HttpStatus.UNPROCESSABLE_ENTITY;
    throw AppException.fromDomain(result.error, status);
  }
  return result.value;
}

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly employeeAuth: EmployeeAuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000, blockDuration: 600_000 } })
  async login(@Body() dto: EmployeeLoginDto, @Req() req: Request) {
    return unwrap(await this.employeeAuth.login(dto.email, dto.password, dto.totpCode, requestContext(req)));
  }

  @Post('totp/setup')
  @UseGuards(EmployeeAuthGuard)
  async totpSetup(@CurrentPrincipal() principal: AccessTokenClaims) {
    return unwrap(await this.employeeAuth.totpSetup(principal.sub));
  }

  @Post('totp/enable')
  @UseGuards(EmployeeAuthGuard)
  async totpEnable(
    @CurrentPrincipal() principal: AccessTokenClaims,
    @Body() dto: TotpEnableDto,
    @Req() req: Request,
  ) {
    return unwrap(await this.employeeAuth.totpEnable(principal.sub, dto.code, requestContext(req)));
  }
}
