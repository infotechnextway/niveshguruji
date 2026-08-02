import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes, randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { AuditService, DomainError, Result } from '@app/shared';
import { User } from '../infrastructure/schemas/user.schema';
import { Session } from '../infrastructure/schemas/session.schema';
import { LoginHistory } from '../infrastructure/schemas/login-history.schema';
import { PasswordService } from '../infrastructure/password.service';
import { TokenService } from '../infrastructure/token.service';
import { OtpService } from '../infrastructure/otp.service';
import { MAIL_SENDER, MailSender } from '../infrastructure/mail/mail.port';
import { RequestContext, TokenPair, UserStatus } from '../domain/auth.types';

export interface RegisterInput {
  name: string;
  email: string;
  mobile: string;
  username: string;
  password: string;
  referredBy?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Session.name) private readonly sessions: Model<Session>,
    @InjectModel(LoginHistory.name) private readonly loginHistory: Model<LoginHistory>,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly otp: OtpService,
    @Inject(MAIL_SENDER) private readonly mail: MailSender,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  // ---------------- Registration & verification ----------------

  async register(input: RegisterInput): Promise<Result<{ userId: string }>> {
    const usernameLower = input.username.toLowerCase();
    const email = input.email.toLowerCase();

    const clash = await this.users
      .findOne({ $or: [{ email }, { mobile: input.mobile }, { usernameLower }] })
      .lean();
    if (clash) {
      const field = clash.email === email ? 'email' : clash.mobile === input.mobile ? 'mobile' : 'username';
      return Result.fail(DomainError.of('DUPLICATE', `An account with this ${field} already exists`, { field }));
    }

    const user = await this.users.create({
      name: input.name,
      email,
      mobile: input.mobile,
      username: input.username,
      usernameLower,
      passwordHash: await this.passwords.hash(input.password),
      referralCode: randomBytes(5).toString('hex').toUpperCase(),
      referredBy: input.referredBy,
      status: UserStatus.PENDING_MOBILE,
    });

    const issued = await this.otp.issue(input.mobile, 'MOBILE_VERIFY');
    if (issued.isFail) return Result.fail(issued.error);
    return Result.ok({ userId: user.id });
  }

  async requestMobileOtp(mobile: string): Promise<Result<{ expiresInSec: number }>> {
    const user = await this.users.findOne({ mobile }).lean();
    if (!user) return Result.fail(DomainError.of('NOT_FOUND', 'No account with this mobile number'));
    if (user.mobileVerified) return Result.fail(DomainError.of('ALREADY_VERIFIED', 'Mobile already verified'));
    return this.otp.issue(mobile, 'MOBILE_VERIFY');
  }

  async verifyMobile(mobile: string, code: string): Promise<Result<{ status: UserStatus }>> {
    const verified = await this.otp.verify(mobile, 'MOBILE_VERIFY', code);
    if (verified.isFail) return Result.fail(verified.error);

    const user = await this.users.findOne({ mobile });
    if (!user) return Result.fail(DomainError.of('NOT_FOUND', 'No account with this mobile number'));
    user.mobileVerified = true;
    if (user.status === UserStatus.PENDING_MOBILE) user.status = UserStatus.PENDING_EMAIL;
    await user.save();

    await this.sendEmailVerification(user.id, user.email);
    return Result.ok({ status: user.status });
  }

  async resendEmailVerification(email: string): Promise<Result<true>> {
    const user = await this.users.findOne({ email: email.toLowerCase() }).lean();
    if (!user) return Result.fail(DomainError.of('NOT_FOUND', 'No account with this email'));
    if (user.emailVerified) return Result.fail(DomainError.of('ALREADY_VERIFIED', 'Email already verified'));
    await this.sendEmailVerification(String(user._id), user.email);
    return Result.ok(true);
  }

  private async sendEmailVerification(userId: string, email: string): Promise<void> {
    const token = this.tokens.signPurpose({ sub: userId, typ: 'email-verify', email }, 24 * 60 * 60);
    const base = this.config.getOrThrow<string>('APP_BASE_URL');
    const link = `${base}/verify-email?token=${token}`;
    await this.mail.send({
      to: email,
      subject: 'Verify your email — RIDGELINE CAPITAL',
      text: `Confirm your email address by opening this link (valid 24 hours):\n${link}\n\nIf you did not create this account, ignore this email.`,
    });
  }

  async verifyEmail(token: string): Promise<Result<{ status: UserStatus }>> {
    let claims;
    try {
      claims = this.tokens.verifyPurpose(token, 'email-verify');
    } catch {
      return Result.fail(DomainError.of('TOKEN_INVALID', 'Verification link is invalid or expired'));
    }
    const user = await this.users.findById(claims.sub);
    if (!user || user.email !== claims.email) {
      return Result.fail(DomainError.of('TOKEN_INVALID', 'Verification link is invalid or expired'));
    }
    if (!user.emailVerified) {
      user.emailVerified = true;
      if (user.status === UserStatus.PENDING_EMAIL) user.status = UserStatus.ACTIVE;
      await user.save();
    }
    return Result.ok({ status: user.status });
  }

  // ---------------- Login / refresh / logout ----------------

  async login(identifier: string, password: string, ctx: RequestContext): Promise<Result<TokenPair>> {
    const query = identifier.includes('@')
      ? { email: identifier.toLowerCase() }
      : { usernameLower: identifier.toLowerCase() };
    const user = await this.users.findOne(query).select('+passwordHash');

    const fail = async (reason: string, principalId?: string) => {
      if (principalId) await this.recordLogin(principalId, false, ctx, reason);
      return Result.fail<TokenPair>(DomainError.of('AUTH_FAILED', 'Invalid credentials'));
    };

    if (!user) return fail('NO_USER');
    if (!(await this.passwords.verify(user.passwordHash, password))) return fail('BAD_PASSWORD', user.id);
    if (user.status === UserStatus.SUSPENDED) {
      await this.recordLogin(user.id, false, ctx, 'SUSPENDED');
      return Result.fail(DomainError.of('SUSPENDED', 'Account suspended. Contact support.'));
    }
    if (user.status !== UserStatus.ACTIVE) {
      await this.recordLogin(user.id, false, ctx, `STATUS_${user.status}`);
      return Result.fail(
        DomainError.of('VERIFICATION_PENDING', 'Complete mobile and email verification first', { status: user.status }),
      );
    }

    await this.notifyIfNewDevice(user.id, user.email, ctx);
    const pair = await this.issuePair(user.id, 'USER', randomUUID(), ctx);
    await this.recordLogin(user.id, true, ctx);
    return Result.ok(pair);
  }

  /**
   * Rotating refresh (US-AUTH-4): valid token → revoke old row, issue new pair
   * in the same family. Revoked/expired token presented again → theft signal →
   * revoke the ENTIRE family.
   */
  async refresh(rawToken: string, ctx: RequestContext): Promise<Result<TokenPair>> {
    const hash = TokenService.hashRefresh(rawToken);
    const session = await this.sessions.findOne({ refreshHash: hash });
    if (!session) return Result.fail(DomainError.of('AUTH_FAILED', 'Invalid session'));

    if (session.revokedAt || session.expiresAt <= new Date()) {
      await this.sessions.updateMany(
        { familyId: session.familyId, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } },
      );
      await this.audit.record({
        actorType: 'SYSTEM',
        actorId: 'auth',
        action: 'SESSION_FAMILY_REVOKED_REUSE',
        entity: 'session_family',
        entityId: session.familyId,
        ip: ctx.ip,
      });
      return Result.fail(DomainError.of('SESSION_REVOKED', 'Session expired. Sign in again.'));
    }

    const pair = await this.issuePair(String(session.principalId), session.actor as 'USER' | 'EMPLOYEE', session.familyId, ctx);
    session.revokedAt = new Date();
    session.replacedByHash = TokenService.hashRefresh(pair.refreshToken);
    await session.save();
    return Result.ok(pair);
  }

  async logout(rawToken: string): Promise<Result<true>> {
    await this.sessions.updateOne(
      { refreshHash: TokenService.hashRefresh(rawToken), revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
    return Result.ok(true);
  }

  async logoutAll(userId: string): Promise<Result<true>> {
    await this.sessions.updateMany(
      { principalId: new Types.ObjectId(userId), revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
    return Result.ok(true);
  }

  // ---------------- Password reset ----------------

  async forgotPassword(email: string): Promise<Result<true>> {
    const user = await this.users.findOne({ email: email.toLowerCase() }).select('+passwordHash').lean();
    // Always return ok — never reveal whether the email exists.
    if (user) {
      const token = this.tokens.signPurpose(
        { sub: String(user._id), typ: 'pwd-reset', pwdFp: TokenService.passwordFingerprint(user.passwordHash) },
        30 * 60,
      );
      const link = `${this.config.getOrThrow<string>('APP_BASE_URL')}/reset-password?token=${token}`;
      await this.mail.send({
        to: user.email,
        subject: 'Reset your password — RIDGELINE CAPITAL',
        text: `Reset your password using this link (valid 30 minutes):\n${link}\n\nIf you did not request this, ignore this email.`,
      });
    }
    return Result.ok(true);
  }

  async resetPassword(token: string, newPassword: string): Promise<Result<true>> {
    let claims;
    try {
      claims = this.tokens.verifyPurpose(token, 'pwd-reset');
    } catch {
      return Result.fail(DomainError.of('TOKEN_INVALID', 'Reset link is invalid or expired'));
    }
    const user = await this.users.findById(claims.sub).select('+passwordHash');
    if (!user || TokenService.passwordFingerprint(user.passwordHash) !== claims.pwdFp) {
      return Result.fail(DomainError.of('TOKEN_INVALID', 'Reset link is invalid or expired'));
    }
    user.passwordHash = await this.passwords.hash(newPassword);
    await user.save();
    await this.logoutAll(user.id); // credential change kills every session
    return Result.ok(true);
  }

  // ---------------- Queries ----------------

  async activeSessions(userId: string) {
    return this.sessions
      .find({ principalId: new Types.ObjectId(userId), revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .select('deviceId ip userAgent createdAt expiresAt')
      .lean();
  }

  async recentLogins(userId: string, limit = 50) {
    return this.loginHistory
      .find({ principalId: new Types.ObjectId(userId) })
      .sort({ at: -1 })
      .limit(limit)
      .lean();
  }

  async me(userId: string) {
    return this.users.findById(userId).select('name email mobile username status kycStatus referralCode createdAt').lean();
  }

  // ---------------- Internals ----------------

  private async issuePair(principalId: string, actor: 'USER' | 'EMPLOYEE', familyId: string, ctx: RequestContext): Promise<TokenPair> {
    const refresh = this.tokens.newRefreshToken();
    await this.sessions.create({
      principalId: new Types.ObjectId(principalId),
      actor,
      refreshHash: refresh.hash,
      familyId,
      deviceId: ctx.deviceId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      expiresAt: refresh.expiresAt,
    });
    return {
      accessToken: this.tokens.signAccess(principalId, actor),
      accessExpiresInSec: this.tokens.accessTtlSec,
      refreshToken: refresh.raw,
      refreshExpiresAt: refresh.expiresAt.toISOString(),
    };
  }

  private async recordLogin(principalId: string, success: boolean, ctx: RequestContext, failureReason?: string): Promise<void> {
    await this.loginHistory.create({
      principalId: new Types.ObjectId(principalId),
      actor: 'USER',
      success,
      failureReason,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      deviceId: ctx.deviceId,
    });
  }

  private async notifyIfNewDevice(userId: string, email: string, ctx: RequestContext): Promise<void> {
    if (!ctx.deviceId) return;
    const seen = await this.loginHistory.exists({
      principalId: new Types.ObjectId(userId),
      deviceId: ctx.deviceId,
      success: true,
    });
    if (!seen) {
      await this.mail.send({
        to: email,
        subject: 'New device sign-in — RIDGELINE CAPITAL',
        text: `A sign-in from a new device was detected.\nIP: ${ctx.ip ?? 'unknown'}\nDevice: ${ctx.userAgent ?? 'unknown'}\n\nIf this was not you, reset your password immediately and sign out of all devices.`,
      });
    }
  }
}
