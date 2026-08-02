import { Quote } from '@app/shared';

/** Angel Smart Stream subscription mode — 2 = Quote (123-byte packets). */
export const ANGEL_QUOTE_MODE = 2;

export interface AngelDecodedTick {
  exchangeType: number;
  token: string;
  ltp: number;
  prevClose: number;
  volume: number;
  ts: number;
}

function readInt64LE(buf: Buffer, offset: number): number {
  return Number(buf.readBigInt64LE(offset));
}

function parseToken(buf: Buffer): string {
  return buf.subarray(2, 27).toString('utf8').replace(/\0/g, '').trim();
}

/** Decode Angel One Smart Stream binary packet (LTP or Quote mode). */
export function decodeAngelPacket(buf: Buffer): AngelDecodedTick | null {
  if (buf.length < 51) return null;

  const mode = buf[0];
  if (mode !== 1 && mode !== 2 && mode !== 3) return null;

  const minLen = mode === 1 ? 51 : mode === 2 ? 123 : 379;
  if (buf.length < minLen) return null;

  const exchangeType = buf[1];
  const token = parseToken(buf);
  const ts = readInt64LE(buf, 35);
  const ltp = readInt64LE(buf, 43) / 100;
  const prevClose = mode >= 2 ? readInt64LE(buf, 115) / 100 : ltp;
  const volume = mode >= 2 ? readInt64LE(buf, 67) : 0;

  return { exchangeType, token, ltp, prevClose, volume, ts };
}

export function angelTickToQuote(tick: AngelDecodedTick, instrumentKey: string): Quote {
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
    ts: tick.ts > 0 ? tick.ts : Date.now(),
  };
}

export function isAngelHeartbeat(buf: Buffer): boolean {
  return buf.length === 4 && buf[0] === 0x70 && buf[1] === 0x6f && buf[2] === 0x6e && buf[3] === 0x67;
}
