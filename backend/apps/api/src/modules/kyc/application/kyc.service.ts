import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { AuditService, DomainError, Result } from '@app/shared';
import { KycApplication } from '../infrastructure/kyc-application.schema';
import { DocumentStoreService } from '../infrastructure/document-store.service';
import {
  KYC_ALLOWED_MIME,
  KYC_DOCUMENT_TYPES,
  KYC_MAX_FILE_BYTES,
  KycAppStatus,
  KycDocumentType,
  transition,
} from '../domain/kyc-state';
import { User } from '../../auth/infrastructure/schemas/user.schema';
import { KycStatus, UserStatus } from '../../auth/domain/auth.types';
import { encryptField } from '../../auth/infrastructure/crypto.util';

export interface UploadedDoc {
  type: KycDocumentType;
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

@Injectable()
export class KycService {
  private readonly fieldSecret: string;

  constructor(
    @InjectModel(KycApplication.name) private readonly applications: Model<KycApplication>,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly store: DocumentStoreService,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.fieldSecret = config.getOrThrow<string>('DATA_ENC_SECRET');
  }

  // ---------------- User side ----------------

  async status(userId: string) {
    const app = await this.applications
      .findOne({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .select('status rejectionReason createdAt updatedAt')
      .lean();
    const user = await this.users.findById(userId).select('kycStatus').lean();
    return { kycStatus: user?.kycStatus ?? KycStatus.NOT_SUBMITTED, latestApplication: app ?? null };
  }

  async submit(userId: string, panNumber: string, docs: UploadedDoc[]): Promise<Result<{ applicationId: string }>> {
    const user = await this.users.findById(userId);
    if (!user) return Result.fail(DomainError.of('NOT_FOUND', 'User not found'));
    if (user.status !== UserStatus.ACTIVE) {
      return Result.fail(DomainError.of('VERIFICATION_PENDING', 'Complete mobile and email verification first'));
    }
    if (user.kycStatus === KycStatus.APPROVED) {
      return Result.fail(DomainError.of('KYC_ALREADY_APPROVED', 'KYC is already approved'));
    }
    if (!PAN_REGEX.test(panNumber)) {
      return Result.fail(DomainError.of('PAN_INVALID', 'PAN must match the format ABCDE1234F'));
    }

    const provided = new Set(docs.map((d) => d.type));
    const missing = KYC_DOCUMENT_TYPES.filter((t) => !provided.has(t));
    if (missing.length) {
      return Result.fail(DomainError.of('KYC_DOCS_MISSING', `Missing documents: ${missing.join(', ')}`, { missing }));
    }
    for (const doc of docs) {
      if (!KYC_ALLOWED_MIME.includes(doc.mimeType as (typeof KYC_ALLOWED_MIME)[number])) {
        return Result.fail(DomainError.of('KYC_DOC_TYPE', `${doc.type}: only JPG, PNG or PDF allowed`));
      }
      if (doc.sizeBytes > KYC_MAX_FILE_BYTES) {
        return Result.fail(DomainError.of('KYC_DOC_SIZE', `${doc.type}: file exceeds 5 MB`));
      }
    }

    const open = await this.applications.exists({
      userId: user._id,
      status: { $in: [KycAppStatus.SUBMITTED, KycAppStatus.UNDER_REVIEW] },
    });
    if (open) return Result.fail(DomainError.of('KYC_ALREADY_PENDING', 'An application is already under review'));

    const stored = [];
    for (const doc of docs) {
      stored.push({
        type: doc.type,
        fileKey: await this.store.save(doc.buffer),
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
      });
    }

    const app = await this.applications.create({
      userId: user._id,
      status: KycAppStatus.SUBMITTED,
      panNumberEnc: encryptField(panNumber, this.fieldSecret),
      documents: stored,
      timeline: [{ at: new Date(), event: 'SUBMITTED' }],
    });

    user.kycStatus = KycStatus.SUBMITTED;
    await user.save();
    return Result.ok({ applicationId: app.id });
  }

  // ---------------- Admin side ----------------

  async queue(status: KycAppStatus | undefined, page: number, pageSize: number) {
    const filter = status ? { status } : { status: { $in: [KycAppStatus.SUBMITTED, KycAppStatus.UNDER_REVIEW] } };
    const [items, total] = await Promise.all([
      this.applications.find(filter).sort({ createdAt: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      this.applications.countDocuments(filter),
    ]);
    const userIds = items.map((a) => a.userId);
    const users = await this.users.find({ _id: { $in: userIds } }).select('name email mobile username').lean();
    const byId = new Map(users.map((u) => [String(u._id), u]));
    return { items: items.map((a) => ({ ...a, user: byId.get(String(a.userId)) ?? null })), total, page, pageSize };
  }

  async detail(applicationId: string): Promise<Result<Record<string, unknown>>> {
    const app = await this.applications.findById(applicationId).lean();
    if (!app) return Result.fail(DomainError.of('NOT_FOUND', 'Application not found'));
    const user = await this.users.findById(app.userId).select('name email mobile username kycStatus').lean();
    return Result.ok({ ...app, user });
  }

  async document(applicationId: string, type: KycDocumentType): Promise<Result<{ buffer: Buffer; mimeType: string }>> {
    const app = await this.applications.findById(applicationId).lean();
    if (!app) return Result.fail(DomainError.of('NOT_FOUND', 'Application not found'));
    const doc = app.documents.find((d) => d.type === type);
    if (!doc) return Result.fail(DomainError.of('NOT_FOUND', 'Document not found'));
    return Result.ok({ buffer: await this.store.load(doc.fileKey), mimeType: doc.mimeType });
  }

  async claim(applicationId: string, reviewerId: string, ip?: string): Promise<Result<true>> {
    return this.applyAction(applicationId, 'CLAIM', reviewerId, undefined, ip);
  }

  async approve(applicationId: string, reviewerId: string, ip?: string): Promise<Result<true>> {
    return this.applyAction(applicationId, 'APPROVE', reviewerId, undefined, ip);
  }

  async reject(applicationId: string, reviewerId: string, reason: string, ip?: string): Promise<Result<true>> {
    return this.applyAction(applicationId, 'REJECT', reviewerId, reason, ip);
  }

  private async applyAction(
    applicationId: string,
    action: 'CLAIM' | 'APPROVE' | 'REJECT',
    reviewerId: string,
    reason: string | undefined,
    ip?: string,
  ): Promise<Result<true>> {
    const app = await this.applications.findById(applicationId);
    if (!app) return Result.fail(DomainError.of('NOT_FOUND', 'Application not found'));
    if (app.status === KycAppStatus.UNDER_REVIEW && action !== 'CLAIM' && app.reviewerId && String(app.reviewerId) !== reviewerId) {
      return Result.fail(DomainError.of('KYC_CLAIMED_BY_OTHER', 'Another reviewer has claimed this application'));
    }

    const next = transition(app.status, action);
    if (next.isFail) return Result.fail(next.error);

    const before = app.status;
    app.status = next.value;
    if (action === 'CLAIM') app.reviewerId = new Types.ObjectId(reviewerId);
    if (action === 'REJECT') app.rejectionReason = reason ?? 'Not specified';
    app.timeline.push({ at: new Date(), event: action, byEmployeeId: reviewerId, note: reason });
    await app.save();

    const userKyc =
      next.value === KycAppStatus.APPROVED
        ? KycStatus.APPROVED
        : next.value === KycAppStatus.REJECTED
          ? KycStatus.REJECTED
          : KycStatus.UNDER_REVIEW;
    await this.users.updateOne({ _id: app.userId }, { $set: { kycStatus: userKyc } });

    await this.audit.record({
      actorType: 'EMPLOYEE', actorId: reviewerId, action: `KYC_${action}`, entity: 'kyc_application',
      entityId: applicationId, before: { status: before }, after: { status: next.value, reason }, ip,
    });
    return Result.ok(true);
  }
}
