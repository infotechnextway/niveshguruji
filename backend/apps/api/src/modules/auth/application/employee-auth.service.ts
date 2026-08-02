import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { authenticator } from 'otplib';
import { ConfigService } from '@nestjs/config';
import { AuditService, DomainError, Result } from '@app/shared';
import { Employee } from '../infrastructure/schemas/employee.schema';
import { Session } from '../infrastructure/schemas/session.schema';
import { LoginHistory } from '../infrastructure/schemas/login-history.schema';
import { PasswordService } from '../infrastructure/password.service';
import { TokenService } from '../infrastructure/token.service';
import { decryptField, encryptField } from '../infrastructure/crypto.util';
import { RequestContext, TokenPair } from '../domain/auth.types';

/**
 * Admin authentication (US-AUTH-7). TOTP is mandatory once enabled; the
 * super-admin seed starts with TOTP disabled and the first action after
 * first login must be /totp/setup + /totp/enable (enforced operationally
 * and surfaced in the response's totpEnabled flag).
 */
@Injectable()
export class EmployeeAuthService {
  private readonly fieldSecret: string;

  constructor(
    @InjectModel(Employee.name) private readonly employees: Model<Employee>,
    @InjectModel(Session.name) private readonly sessions: Model<Session>,
    @InjectModel(LoginHistory.name) private readonly loginHistory: Model<LoginHistory>,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.fieldSecret = config.getOrThrow<string>('DATA_ENC_SECRET');
  }

  async login(email: string, password: string, totpCode: string | undefined, ctx: RequestContext): Promise<Result<TokenPair & { totpEnabled: boolean }>> {
    const employee = await this.employees
      .findOne({ email: email.toLowerCase() })
      .select('+passwordHash +totpSecretEnc');

    const authFail = () => Result.fail<TokenPair & { totpEnabled: boolean }>(DomainError.of('AUTH_FAILED', 'Invalid credentials'));

    if (!employee || employee.status !== 'ACTIVE') return authFail();
    if (!(await this.passwords.verify(employee.passwordHash, password))) {
      await this.recordLogin(employee.id, false, ctx, 'BAD_PASSWORD');
      return authFail();
    }

    if (employee.totpEnabled) {
      if (!totpCode) {
        return Result.fail(DomainError.of('TOTP_REQUIRED', 'Enter your authenticator code'));
      }
      const secret = decryptField(employee.totpSecretEnc as string, this.fieldSecret);
      if (!authenticator.verify({ token: totpCode, secret })) {
        await this.recordLogin(employee.id, false, ctx, 'BAD_TOTP');
        return Result.fail(DomainError.of('TOTP_INVALID', 'Incorrect authenticator code'));
      }
    }

    const refresh = this.tokens.newRefreshToken();
    await this.sessions.create({
      principalId: new Types.ObjectId(employee.id),
      actor: 'EMPLOYEE',
      refreshHash: refresh.hash,
      familyId: randomUUID(),
      deviceId: ctx.deviceId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      expiresAt: refresh.expiresAt,
    });
    await this.recordLogin(employee.id, true, ctx);

    return Result.ok({
      accessToken: this.tokens.signAccess(employee.id, 'EMPLOYEE', employee.roles),
      accessExpiresInSec: this.tokens.accessTtlSec,
      refreshToken: refresh.raw,
      refreshExpiresAt: refresh.expiresAt.toISOString(),
      totpEnabled: employee.totpEnabled,
    });
  }

  /** Returns the otpauth:// provisioning URI; secret is stored encrypted, pending enable. */
  async totpSetup(employeeId: string): Promise<Result<{ otpauthUri: string }>> {
    const employee = await this.employees.findById(employeeId);
    if (!employee) return Result.fail(DomainError.of('NOT_FOUND', 'Employee not found'));
    if (employee.totpEnabled) return Result.fail(DomainError.of('TOTP_ALREADY_ENABLED', '2FA is already enabled'));

    const secret = authenticator.generateSecret();
    employee.totpSecretEnc = encryptField(secret, this.fieldSecret);
    await employee.save();

    const uri = authenticator.keyuri(employee.email, 'PaperTradingSim Admin', secret);
    return Result.ok({ otpauthUri: uri });
  }

  /** Confirms possession of the authenticator by verifying one code, then enforces TOTP on every future login. */
  async totpEnable(employeeId: string, code: string, ctx: RequestContext): Promise<Result<true>> {
    const employee = await this.employees.findById(employeeId).select('+totpSecretEnc');
    if (!employee?.totpSecretEnc) return Result.fail(DomainError.of('TOTP_NOT_SETUP', 'Run TOTP setup first'));
    const secret = decryptField(employee.totpSecretEnc, this.fieldSecret);
    if (!authenticator.verify({ token: code, secret })) {
      return Result.fail(DomainError.of('TOTP_INVALID', 'Incorrect authenticator code'));
    }
    employee.totpEnabled = true;
    await employee.save();
    await this.audit.record({
      actorType: 'EMPLOYEE',
      actorId: employeeId,
      action: 'TOTP_ENABLED',
      entity: 'employee',
      entityId: employeeId,
      ip: ctx.ip,
    });
    return Result.ok(true);
  }

  private async recordLogin(principalId: string, success: boolean, ctx: RequestContext, failureReason?: string): Promise<void> {
    await this.loginHistory.create({
      principalId: new Types.ObjectId(principalId),
      actor: 'EMPLOYEE',
      success,
      failureReason,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      deviceId: ctx.deviceId,
    });
  }
}
