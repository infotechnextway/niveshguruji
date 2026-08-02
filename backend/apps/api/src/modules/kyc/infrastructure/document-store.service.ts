import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join, normalize } from 'path';
import { randomUUID } from 'crypto';
import { decryptBuffer, encryptBuffer } from '../../auth/infrastructure/crypto.util';

/**
 * Encrypted-at-rest document store (US-KYC-1 / NFR-5). Files land under
 * STORAGE_DIR/kyc as AES-256-GCM blobs; keys are opaque UUID-based paths so
 * nothing about the user or document type leaks from the filesystem.
 */
@Injectable()
export class DocumentStoreService {
  private readonly root: string;
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.root = join(config.getOrThrow<string>('STORAGE_DIR'), 'kyc');
    this.secret = config.getOrThrow<string>('DATA_ENC_SECRET');
  }

  async save(plain: Buffer): Promise<string> {
    const id = randomUUID();
    const key = join(id.slice(0, 2), `${id}.bin`);
    const dir = join(this.root, id.slice(0, 2));
    await mkdir(dir, { recursive: true });
    await writeFile(join(this.root, key), encryptBuffer(plain, this.secret), { mode: 0o600 });
    return key;
  }

  async load(fileKey: string): Promise<Buffer> {
    const safe = normalize(fileKey);
    if (safe.startsWith('..') || safe.includes('..')) throw new Error('Invalid file key');
    return decryptBuffer(await readFile(join(this.root, safe)), this.secret);
  }
}
