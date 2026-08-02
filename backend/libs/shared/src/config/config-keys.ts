import { z } from 'zod';

/**
 * Registry of every business config key, its zod schema, and its seeded default.
 * Adding a business number to the codebase means adding it HERE — never inline.
 */
const timeHHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const CONFIG_REGISTRY = {
  'market.window.EQ': {
    schema: z.object({ open: timeHHMM, close: timeHHMM }),
    default: { open: '09:15', close: '15:30' },
    description: 'NSE/BSE equity & derivatives trading window (IST)',
  },
  'market.window.CUR': {
    schema: z.object({ open: timeHHMM, close: timeHHMM }),
    default: { open: '09:00', close: '17:00' },
    description: 'Currency derivatives trading window (IST)',
  },
  'trading.squareoff.EQ': {
    schema: timeHHMM,
    default: '15:15',
    description: 'Intraday auto square-off time, equity/derivatives (IST)',
  },
  'trading.squareoff.CUR': {
    schema: timeHHMM,
    default: '16:45',
    description: 'Intraday auto square-off time, currency (IST)',
  },
  'trading.slippage.bps': {
    schema: z.number().min(0).max(500),
    default: 0,
    description: 'Simulated market-order slippage in basis points',
  },
  'trading.charges.model': {
    schema: z.object({
      flatPerOrderPaise: z.number().int().min(0),
      turnoverBps: z.number().min(0).max(100),
    }),
    default: { flatPerOrderPaise: 0, turnoverBps: 0 },
    description: 'Simulated charges: flat per executed order + bps of turnover (approved default: zero)',
  },
  'watchlist.maxSymbolsPerTab': {
    schema: z.number().int().min(1).max(200),
    default: 50,
    description: 'Maximum symbols a user may keep per watchlist tab',
  },
  'challenge.dailyDD.anchor': {
    schema: z.enum(['PREV_DAY_CLOSE', 'INITIAL_CAPITAL']),
    default: 'PREV_DAY_CLOSE',
    description: 'Daily drawdown anchor (approved default: previous-day closing equity)',
  },
  'challenge.freezeOnPass': {
    schema: z.boolean(),
    default: true,
    description: 'Freeze trading immediately when a challenge is PASSED (approved default: true)',
  },
  'statements.maxRangeDays': {
    schema: z.number().int().min(1).max(183),
    default: 183,
    description: 'Maximum statement window in days (C-4: six months)',
  },
  'feed.staleAlertSeconds': {
    schema: z.number().int().min(2).max(120),
    default: 10,
    description: 'Seconds without a tick during market hours before the stale-feed watchdog alerts',
  },
  'auth.otp.ttlSeconds': {
    schema: z.number().int().min(60).max(900),
    default: 300,
    description: 'Mobile OTP validity window (US-AUTH-2)',
  },
  'auth.otp.maxAttempts': {
    schema: z.number().int().min(1).max(10),
    default: 3,
    description: 'Max wrong attempts per OTP before it is voided',
  },
  'auth.otp.maxPerHour': {
    schema: z.number().int().min(1).max(20),
    default: 5,
    description: 'Max OTPs issued per mobile number per hour',
  },
  'auth.otp.resendCooldownSeconds': {
    schema: z.number().int().min(15).max(600),
    default: 60,
    description: 'Cooldown between OTP sends to the same number',
  },
  'auth.accessToken.ttlSeconds': {
    schema: z.number().int().min(300).max(3600),
    default: 900,
    description: 'Access JWT lifetime (US-AUTH-4: 15 min)',
  },
  'auth.refreshToken.ttlDays': {
    schema: z.number().int().min(1).max(90),
    default: 30,
    description: 'Refresh token lifetime (US-AUTH-4: 30 days)',
  },
  'plan.allowMultipleActiveChallenges': {
    schema: z.boolean(),
    default: false,
    description: 'Whether a user may hold more than one ACTIVE challenge at once (US-PLAN-5)',
  },
} as const;

export type ConfigKey = keyof typeof CONFIG_REGISTRY;
export type ConfigValue<K extends ConfigKey> = z.infer<(typeof CONFIG_REGISTRY)[K]['schema']>;
