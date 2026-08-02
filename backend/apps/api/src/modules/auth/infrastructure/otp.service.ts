import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppConfigService, DomainError, Result } from '@app/shared';
import { OtpRequest } from './schemas/otp-request.schema';
import { generateOtpCode, hashOtpCode, otpMatches } from './otp.util';
import { SMS_SENDER, SmsSender } from './sms/sms.port';
import { Inject } from '@nestjs/common';

/**
 * OTP issue/verify with the US-AUTH-2 limits, all values from config:
 * TTL, max attempts per code, max sends/hour, resend cooldown.
 */
@Injectable()
export class OtpService {
  private readonly pepper: string;

  constructor(
    @InjectModel(OtpRequest.name) private readonly model: Model<OtpRequest>,
    private readonly appConfig: AppConfigService,
    @Inject(SMS_SENDER) private readonly sms: SmsSender,
    config: ConfigService,
  ) {
    this.pepper = config.getOrThrow<string>('OTP_PEPPER');
  }

  async issue(target: string, purpose: 'MOBILE_VERIFY' | 'MOBILE_CHANGE'): Promise<Result<{ expiresInSec: number }>> {
    const now = Date.now();
    const hourAgo = new Date(now - 60 * 60 * 1000);
    const sentLastHour = await this.model.countDocuments({ target, createdAt: { $gte: hourAgo } });
    if (sentLastHour >= this.appConfig.get('auth.otp.maxPerHour')) {
      return Result.fail(DomainError.of('OTP_HOURLY_LIMIT', 'Too many OTP requests. Try again later.'));
    }

    const cooldown = this.appConfig.get('auth.otp.resendCooldownSeconds');
    const latest = await this.model.findOne({ target }).sort({ createdAt: -1 }).lean();
    if (latest && now - new Date((latest as { createdAt?: Date }).createdAt ?? 0).getTime() < cooldown * 1000) {
      return Result.fail(DomainError.of('OTP_COOLDOWN', `Please wait ${cooldown}s before requesting another OTP`));
    }

    const ttlSec = this.appConfig.get('auth.otp.ttlSeconds');
    const code = generateOtpCode();
    await this.model.create({
      target,
      channel: 'SMS',
      purpose,
      codeHash: hashOtpCode(code, this.pepper),
      expiresAt: new Date(now + ttlSec * 1000),
    });
    await this.sms.sendOtp(target, code, Math.round(ttlSec / 60));
    return Result.ok({ expiresInSec: ttlSec });
  }

  async verify(target: string, purpose: string, code: string): Promise<Result<true>> {
    const doc = await this.model
      .findOne({ target, purpose, consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 });
    if (!doc) {
      return Result.fail(DomainError.of('OTP_NOT_FOUND', 'No active OTP. Request a new one.'));
    }
    const maxAttempts = this.appConfig.get('auth.otp.maxAttempts');
    if (doc.attempts >= maxAttempts) {
      return Result.fail(DomainError.of('OTP_LOCKED', 'Too many wrong attempts. Request a new OTP.'));
    }
    if (!otpMatches(code, this.pepper, doc.codeHash)) {
      doc.attempts += 1;
      await doc.save();
      return Result.fail(DomainError.of('OTP_INVALID', 'Incorrect OTP', { attemptsLeft: maxAttempts - doc.attempts }));
    }
    doc.consumedAt = new Date();
    await doc.save();
    return Result.ok(true);
  }
}
