import { Quote } from '@app/shared';

/** Dhan v2 WebSocket — RequestCode 17 = Quote mode (50-byte quote packets). */
export const DHAN_QUOTE_REQUEST_CODE = 17;
export const DHAN_UNSUB_REQUEST_CODE = 16;

/** Numeric exchange segment in binary header → string enum used in subscriptions. */
export const DHAN_SEGMENT_BYTE_TO_STRING: Record<number, string> = {
  0: 'IDX_I',
  1: 'NSE_EQ',
  2: 'NSE_FNO',
  3: 'NSE_CURRENCY',
  4: 'BSE_EQ',
  5: 'MCX_COMM',
  7: 'BSE_CURRENCY',
  8: 'BSE_FNO',
};

export interface DhanDecodedTick {
  exchangeSegment: string;
  securityId: string;
  ltp: number;
  prevClose: number;
  volume: number;
  ts: number;
}

/** Decode Dhan v2 binary quote packet (feed response code 4). */
export function decodeDhanPacket(buf: Buffer): DhanDecodedTick | null {
  if (buf.length < 50) return null;

  const responseCode = buf[0];
  // 2 = ticker, 4 = quote, 6 = prev close, 8 = full
  if (responseCode !== 2 && responseCode !== 4 && responseCode !== 6) return null;

  const segmentByte = buf[3];
  const exchangeSegment = DHAN_SEGMENT_BYTE_TO_STRING[segmentByte];
  if (!exchangeSegment) return null;

  const securityId = String(buf.readInt32LE(4));

  if (responseCode === 6) {
    const prevClose = buf.readFloatLE(8);
    return { exchangeSegment, securityId, ltp: prevClose, prevClose, volume: 0, ts: Date.now() };
  }

  const ltp = buf.readFloatLE(8);
  const lttSec = responseCode === 4 ? buf.readInt32LE(14) : buf.readInt32LE(12);
  const volume = responseCode === 4 ? buf.readInt32LE(22) : 0;
  const dayClose = responseCode === 4 && buf.length >= 42 ? buf.readFloatLE(38) : ltp;
  const prevClose = dayClose > 0 ? dayClose : ltp;
  const ts = lttSec > 0 ? lttSec * 1000 : Date.now();

  return { exchangeSegment, securityId, ltp, prevClose, volume, ts };
}

export function dhanTickToQuote(tick: DhanDecodedTick, instrumentKey: string): Quote {
  const change = tick.ltp - tick.prevClose;
  const changePct = tick.prevClose > 0 ? (change / tick.prevClose) * 100 : 0;
  return {
    instrumentKey,
    ltp: tick.ltp,
    change,
    changePct,
    bid: tick.ltp,
    ask: tick.ltp,
    volume: tick.volume,
    prevClose: tick.prevClose,
    ts: tick.ts,
  };
}

/** Server disconnect packet (response code 50). */
export function isDhanDisconnect(buf: Buffer): boolean {
  return buf.length >= 8 && buf[0] === 50;
}
