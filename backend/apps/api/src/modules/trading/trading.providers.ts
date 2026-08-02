import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './infrastructure/schemas/order.schema';
import { Position, PositionSchema } from './infrastructure/schemas/position.schema';
import { Holding, HoldingSchema } from './infrastructure/schemas/holding.schema';
import { Trade, TradeSchema } from './infrastructure/schemas/trade.schema';
import { Challenge, ChallengeSchema } from '../plans/infrastructure/schemas/challenge.schema';
import { LedgerEntry, LedgerEntrySchema } from '../plans/infrastructure/schemas/ledger-entry.schema';
import { Instrument, InstrumentSchema } from '../market/infrastructure/schemas/instrument.schema';

export const TradingMongoModels = MongooseModule.forFeature([
  { name: Order.name, schema: OrderSchema },
  { name: Position.name, schema: PositionSchema },
  { name: Holding.name, schema: HoldingSchema },
  { name: Trade.name, schema: TradeSchema },
  { name: Challenge.name, schema: ChallengeSchema },
  { name: LedgerEntry.name, schema: LedgerEntrySchema },
  { name: Instrument.name, schema: InstrumentSchema },
]);
