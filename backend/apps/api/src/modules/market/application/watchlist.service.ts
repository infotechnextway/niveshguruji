import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppConfigService, DomainError, Result } from '@app/shared';
import { Watchlist } from '../infrastructure/schemas/watchlist.schema';
import { Instrument } from '../infrastructure/schemas/instrument.schema';
import { traderCatalogMatch } from '../infrastructure/trader-catalog';
import { InstrumentService } from './instrument.service';

const BUILTIN = ['STOCKS', 'INDICES', 'OPTIONS', 'CURRENCY'] as const;
const TAB_SEGMENT: Record<string, string> = {
  STOCKS: 'EQ',
  INDICES: 'INDEX',
  OPTIONS: 'FO',
  CURRENCY: 'CUR',
};
type Tab = string;

function asObjectId(userId: string): Types.ObjectId | null {
  if (!userId || !Types.ObjectId.isValid(userId)) return null;
  return new Types.ObjectId(userId);
}

@Injectable()
export class WatchlistService {
  constructor(
    @InjectModel(Watchlist.name) private readonly watchlists: Model<Watchlist>,
    @InjectModel(Instrument.name) private readonly instruments: Model<Instrument>,
    private readonly appConfig: AppConfigService,
    private readonly instrumentService: InstrumentService,
  ) {}

  async listTabs(userId: string) {
    const uid = asObjectId(userId);
    const builtinCounts = await Promise.all(
      BUILTIN.map(async (t) => {
        const seg = TAB_SEGMENT[t];
        const catalogCount = await this.instrumentService.countBySegment(seg);
        return { tab: t, name: t.charAt(0) + t.slice(1).toLowerCase(), count: catalogCount };
      }),
    );
    const out: Array<{ tab: string; name: string; count: number }> = [...builtinCounts];
    if (!uid) return out;

    const rows = await this.watchlists.find({ userId: uid }).select('tab name items').lean();
    for (const row of rows) {
      if ((BUILTIN as readonly string[]).includes(row.tab)) continue;
      out.push({ tab: row.tab, name: row.name || row.tab, count: row.items?.length ?? 0 });
    }
    return out;
  }

  async createTab(userId: string, name: string): Promise<Result<{ tab: string; name: string }>> {
    const uid = asObjectId(userId);
    if (!uid) return Result.fail(DomainError.of('UNAUTHORIZED', 'Valid user session required'));

    const existing = await this.watchlists.find({ userId: uid, tab: { $regex: /^WL\d+$/ } })
      .select('tab').lean();
    const used = new Set(existing.map((r) => r.tab));
    let tab = '';
    for (let i = 1; i <= 20; i++) {
      const id = `WL${i}`;
      if (!used.has(id)) { tab = id; break; }
    }
    if (!tab) return Result.fail(DomainError.of('WATCHLIST_FULL', 'Maximum 20 custom watchlists'));
    const trimmed = name.trim().slice(0, 40);
    await this.watchlists.updateOne(
      { userId: uid, tab },
      { $setOnInsert: { items: [], name: trimmed } },
      { upsert: true },
    );
    return Result.ok({ tab, name: trimmed });
  }

  async renameTab(userId: string, tab: Tab, name: string): Promise<Result<true>> {
    const uid = asObjectId(userId);
    if (!uid) return Result.fail(DomainError.of('UNAUTHORIZED', 'Valid user session required'));
    if ((BUILTIN as readonly string[]).includes(tab)) {
      return Result.fail(DomainError.of('INVALID', 'Built-in tabs cannot be renamed'));
    }
    const res = await this.watchlists.updateOne(
      { userId: uid, tab },
      { $set: { name: name.trim().slice(0, 40) } },
    );
    if (!res.matchedCount) return Result.fail(DomainError.of('NOT_FOUND', 'Watchlist not found'));
    return Result.ok(true);
  }

  async get(userId: string, tab: Tab) {
    const uid = asObjectId(userId);
    if (!uid) return [];
    const wl = await this.watchlists.findOne({ userId: uid, tab }).lean();
    const items = wl?.items ?? [];
    const keys = items.map((i) => i.instrumentKey);
    if (!keys.length) return [];
    const instruments = await this.instruments.find({ ...traderCatalogMatch(), instrumentKey: { $in: keys } })
      .select('instrumentKey symbol name exchange segment lotSize underlyingKey').lean();
    const byKey = new Map(instruments.map((i) => [i.instrumentKey, i]));
    return items
      .sort((a, b) => a.sort - b.sort)
      .map((i) => ({ ...i, instrument: byKey.get(i.instrumentKey) ?? null }));
  }

  async add(userId: string, tab: Tab, instrumentKey: string): Promise<Result<true>> {
    const uid = asObjectId(userId);
    if (!uid) return Result.fail(DomainError.of('UNAUTHORIZED', 'Valid user session required'));

    const instrument = await this.instruments.findOne(traderCatalogMatch({ instrumentKey })).lean();
    if (!instrument) return Result.fail(DomainError.of('NOT_FOUND', 'Instrument not found'));

    const max = this.appConfig.get('watchlist.maxSymbolsPerTab');
    const wl = await this.watchlists.findOne({ userId: uid, tab });
    if (wl && wl.items.length >= max) {
      return Result.fail(DomainError.of('WATCHLIST_FULL', `A tab can hold at most ${max} symbols`));
    }
    if (wl?.items.some((i) => i.instrumentKey === instrumentKey)) {
      return Result.ok(true);
    }
    const sort = wl ? wl.items.length : 0;
    await this.watchlists.updateOne(
      { userId: uid, tab },
      { $push: { items: { instrumentKey, sort } } },
      { upsert: true },
    );
    return Result.ok(true);
  }

  async remove(userId: string, tab: Tab, instrumentKey: string): Promise<Result<true>> {
    const uid = asObjectId(userId);
    if (!uid) return Result.ok(true);
    await this.watchlists.updateOne(
      { userId: uid, tab },
      { $pull: { items: { instrumentKey } } },
    );
    return Result.ok(true);
  }

  async reorder(userId: string, tab: Tab, orderedKeys: string[]): Promise<Result<true>> {
    const uid = asObjectId(userId);
    if (!uid) return Result.fail(DomainError.of('UNAUTHORIZED', 'Valid user session required'));
    const wl = await this.watchlists.findOne({ userId: uid, tab });
    if (!wl) return Result.fail(DomainError.of('NOT_FOUND', 'Watchlist not found'));
    const rank = new Map(orderedKeys.map((k, i) => [k, i] as const));
    wl.items = wl.items.map((i) => ({ instrumentKey: i.instrumentKey, sort: rank.get(i.instrumentKey) ?? i.sort }));
    await wl.save();
    return Result.ok(true);
  }
}
