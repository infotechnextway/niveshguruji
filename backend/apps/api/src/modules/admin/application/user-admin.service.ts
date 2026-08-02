import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService, DomainError, Result } from '@app/shared';
import { User } from '../../auth/infrastructure/schemas/user.schema';
import { Session } from '../../auth/infrastructure/schemas/session.schema';
import { LoginHistory } from '../../auth/infrastructure/schemas/login-history.schema';
import { UserStatus } from '../../auth/domain/auth.types';

@Injectable()
export class UserAdminService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Session.name) private readonly sessions: Model<Session>,
    @InjectModel(LoginHistory.name) private readonly logins: Model<LoginHistory>,
    private readonly audit: AuditService,
  ) {}

  async list(search: string | undefined, page: number, pageSize: number) {
    const filter = search
      ? {
          $or: [
            { email: { $regex: escapeRegex(search), $options: 'i' } },
            { usernameLower: { $regex: escapeRegex(search.toLowerCase()) } },
            { mobile: { $regex: escapeRegex(search) } },
            { name: { $regex: escapeRegex(search), $options: 'i' } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.users.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize)
        .select('name email mobile username status kycStatus createdAt').lean(),
      this.users.countDocuments(filter),
    ]);
    return { items, total, page, pageSize };
  }

  /** 360° view (US-ADM-3) — grows as later modules land (plans, trades, ledger). */
  async detail(id: string): Promise<Result<Record<string, unknown>>> {
    const user = await this.users.findById(id).lean();
    if (!user) return Result.fail(DomainError.of('NOT_FOUND', 'User not found'));
    const principalId = new Types.ObjectId(id);
    const [activeSessions, recentLogins] = await Promise.all([
      this.sessions.countDocuments({ principalId, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } }),
      this.logins.find({ principalId }).sort({ at: -1 }).limit(20).lean(),
    ]);
    return Result.ok({ user, activeSessions, recentLogins });
  }

  async suspend(id: string, reason: string, actorId: string, ip?: string): Promise<Result<true>> {
    return this.setStatus(id, UserStatus.SUSPENDED, 'USER_SUSPENDED', reason, actorId, ip);
  }

  async unsuspend(id: string, reason: string, actorId: string, ip?: string): Promise<Result<true>> {
    const user = await this.users.findById(id).lean();
    if (!user) return Result.fail(DomainError.of('NOT_FOUND', 'User not found'));
    if (user.status !== UserStatus.SUSPENDED) {
      return Result.fail(DomainError.of('NOT_SUSPENDED', 'User is not suspended'));
    }
    // Restore to the correct pre-suspension point in the verification flow.
    const restored = !user.mobileVerified
      ? UserStatus.PENDING_MOBILE
      : !user.emailVerified
        ? UserStatus.PENDING_EMAIL
        : UserStatus.ACTIVE;
    return this.setStatus(id, restored, 'USER_UNSUSPENDED', reason, actorId, ip);
  }

  private async setStatus(id: string, status: UserStatus, action: string, reason: string, actorId: string, ip?: string): Promise<Result<true>> {
    const before = await this.users.findById(id).lean();
    if (!before) return Result.fail(DomainError.of('NOT_FOUND', 'User not found'));
    await this.users.updateOne({ _id: id }, { $set: { status } });
    if (status === UserStatus.SUSPENDED) {
      await this.sessions.updateMany(
        { principalId: new Types.ObjectId(id), revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } },
      );
    }
    await this.audit.record({
      actorType: 'EMPLOYEE', actorId, action, entity: 'user', entityId: id,
      before: { status: before.status }, after: { status, reason }, ip,
    });
    return Result.ok(true);
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
