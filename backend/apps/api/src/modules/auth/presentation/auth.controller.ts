import { Body, Controller, Get, HttpStatus, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AppException } from '@app/shared';
import { AuthService } from '../application/auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  RequestOtpDto,
  ResendEmailDto,
  ResetPasswordDto,
  VerifyEmailDto,
  VerifyMobileDto,
} from './dto/auth.dtos';
import { UserAuthGuard } from './jwt-auth.guard';
import { CurrentPrincipal, requestContext } from './current-principal.decorator';
import { AccessTokenClaims } from '../domain/auth.types';
import { DomainError, Result } from '@app/shared';

/** Strict limiter for credential/OTP endpoints: 5/min, then 5-minute block. */
const STRICT = { default: { limit: 5, ttl: 60_000, blockDuration: 300_000 } };

function unwrap<T>(result: Result<T, DomainError>, failStatus = HttpStatus.UNPROCESSABLE_ENTITY): T {
  if (result.isFail) throw AppException.fromDomain(result.error, statusFor(result.error.code, failStatus));
  return result.value;
}

function statusFor(code: string, fallback: HttpStatus): HttpStatus {
  switch (code) {
    case 'AUTH_FAILED':
    case 'SESSION_REVOKED':
    case 'TOKEN_INVALID':
      return HttpStatus.UNAUTHORIZED;
    case 'SUSPENDED':
    case 'VERIFICATION_PENDING':
      return HttpStatus.FORBIDDEN;
    case 'NOT_FOUND':
      return HttpStatus.NOT_FOUND;
    case 'DUPLICATE':
      return HttpStatus.CONFLICT;
    case 'OTP_HOURLY_LIMIT':
    case 'OTP_COOLDOWN':
      return HttpStatus.TOO_MANY_REQUESTS;
    default:
      return fallback;
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle(STRICT)
  async register(@Body() dto: RegisterDto) {
    return unwrap(await this.auth.register(dto));
  }

  @Post('otp/request')
  @Throttle(STRICT)
  async requestOtp(@Body() dto: RequestOtpDto) {
    return unwrap(await this.auth.requestMobileOtp(dto.mobile));
  }

  @Post('otp/verify')
  @Throttle(STRICT)
  async verifyMobile(@Body() dto: VerifyMobileDto) {
    return unwrap(await this.auth.verifyMobile(dto.mobile, dto.code));
  }

  @Post('email/resend')
  @Throttle(STRICT)
  async resendEmail(@Body() dto: ResendEmailDto) {
    return unwrap(await this.auth.resendEmailVerification(dto.email));
  }

  @Get('email/verify')
  async verifyEmail(@Query() dto: VerifyEmailDto) {
    return unwrap(await this.auth.verifyEmail(dto.token));
  }

  @Post('login')
  @Throttle(STRICT)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return unwrap(await this.auth.login(dto.identifier, dto.password, requestContext(req)));
  }

  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return unwrap(await this.auth.refresh(dto.refreshToken, requestContext(req)));
  }

  @Post('logout')
  async logout(@Body() dto: RefreshDto) {
    return unwrap(await this.auth.logout(dto.refreshToken));
  }

  @Post('logout-all')
  @UseGuards(UserAuthGuard)
  async logoutAll(@CurrentPrincipal() principal: AccessTokenClaims) {
    return unwrap(await this.auth.logoutAll(principal.sub));
  }

  @Post('password/forgot')
  @Throttle(STRICT)
  async forgot(@Body() dto: ForgotPasswordDto) {
    return unwrap(await this.auth.forgotPassword(dto.email));
  }

  @Post('password/reset')
  @Throttle(STRICT)
  async reset(@Body() dto: ResetPasswordDto) {
    return unwrap(await this.auth.resetPassword(dto.token, dto.newPassword));
  }

  @Get('me')
  @UseGuards(UserAuthGuard)
  async me(@CurrentPrincipal() principal: AccessTokenClaims) {
    return this.auth.me(principal.sub);
  }

  @Get('sessions')
  @UseGuards(UserAuthGuard)
  async sessions(@CurrentPrincipal() principal: AccessTokenClaims) {
    return this.auth.activeSessions(principal.sub);
  }

  @Get('login-history')
  @UseGuards(UserAuthGuard)
  async loginHistory(@CurrentPrincipal() principal: AccessTokenClaims) {
    return this.auth.recentLogins(principal.sub);
  }
}
